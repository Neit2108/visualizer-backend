// ==========================================
// SQL Execution Service
// Business logic for executing SQL statements
// ==========================================

import type { PoolConnection } from 'mysql2/promise';
import type {
  ExecuteSQLResponse,
  GetTablesResponse,
  TableSchema,
  TableData,
  ERDiagram,
  QueryVisualization,
} from '../types/index.js';
import { SQLRepository } from '../repositories/sql.repository.js';
import { SQLParserService } from './sql-parser.service.js';
import { SQLVisualizationService } from './sql-visualization.service.js';
import { ValidationError, SQLExecutionError } from '../utils/errors.js';

export class SQLExecutionService {
  private parser: SQLParserService;
  private visualizationService: SQLVisualizationService;

  constructor() {
    this.parser = new SQLParserService();
    this.visualizationService = new SQLVisualizationService();
  }

  /**
   * Execute SQL statement(s)
   */
  async executeSQL(connection: PoolConnection, schemaName: string, sql: string): Promise<ExecuteSQLResponse> {
    if (!sql?.trim()) {
      throw new ValidationError('SQL statement is required');
    }

    const repository = new SQLRepository(connection, schemaName);
    const statementType = this.parser.detectStatementType(sql);

    try {
      switch (statementType) {
        case 'SELECT': {
          const rows = await repository.executeQuery(sql);
          const columns = rows.length > 0 && rows[0] ? Object.keys(rows[0]) : [];

          return {
            success: true,
            message: `Query returned ${rows.length} rows`,
            data: {
              tableName: 'Query Result',
              columns,
              rows,
            },
          };
        }

        case 'CREATE TABLE': {
          const parsed = this.parser.parseCreateTable(sql);
          await repository.executeStatement(sql);

          return {
            success: true,
            message: `Table '${parsed.tableName}' created successfully`,
            affectedTables: [parsed.tableName],
          };
        }

        case 'INSERT':
        case 'UPDATE':
        case 'DELETE': {
          // Extract table name
          const tableMatch = sql.match(/(?:INTO|UPDATE|FROM)\s+`?(\w+)`?/i);
          const tableName = tableMatch?.[1] ?? 'unknown';

          const result = await repository.executeStatement(sql);

          return {
            success: true,
            message: `${statementType} executed successfully. ${result.changes} rows affected.`,
            affectedTables: [tableName],
          };
        }

        case 'DROP TABLE': {
          const tableMatch = sql.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?`?(\w+)`?/i);
          const tableName = tableMatch?.[1] ?? 'unknown';

          await repository.executeStatement(sql);

          return {
            success: true,
            message: `Table '${tableName}' dropped successfully`,
            affectedTables: [tableName],
          };
        }

        default: {
          // Try to execute as generic statement
          try {
            await repository.executeStatement(sql);
            return {
              success: true,
              message: 'Statement executed successfully',
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new SQLExecutionError(`Failed to execute statement: ${message}`);
          }
        }
      }
    } finally {
      // Note: Don't release here - let the caller manage the connection
    }
  }

  /**
   * Execute multiple SQL statements
   */
  async executeMultipleSQL(connection: PoolConnection, schemaName: string, sqlStatements: string): Promise<ExecuteSQLResponse[]> {
    // Split by semicolon but be careful with quoted strings
    const statements = this.splitStatements(sqlStatements);
    const results: ExecuteSQLResponse[] = [];

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const result = await this.executeSQL(connection, schemaName, statement);
          results.push(result);
        } catch (error) {
          if (error instanceof Error) {
            results.push({
              success: false,
              message: error.message,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Get all tables with their schemas and data
   */
  async getTables(connection: PoolConnection, schemaName: string): Promise<GetTablesResponse> {
    const repository = new SQLRepository(connection, schemaName);

    const tableNames = await repository.getTableNames();
    const tables: TableSchema[] = [];
    const tableData: TableData[] = [];

    for (const tableName of tableNames) {
      tables.push(await repository.getTableSchema(tableName));
      tableData.push(await repository.getTableData(tableName));
    }

    // Generate ER diagram if there are 2 or more tables
    let erDiagram: ERDiagram | undefined;
    if (tables.length >= 2) {
      const relationships = await repository.getRelationships();
      erDiagram = {
        tables,
        relationships,
      };
    }

    return {
      tables,
      tableData,
      erDiagram,
    };
  }

  /**
   * Get single table data
   */
  async getTableData(connection: PoolConnection, schemaName: string, tableName: string): Promise<TableData> {
    const repository = new SQLRepository(connection, schemaName);

    const exists = await repository.tableExists(tableName);
    if (!exists) {
      throw new ValidationError(`Table '${tableName}' does not exist`);
    }

    return await repository.getTableData(tableName);
  }

  /**
   * Visualize query execution
   */
  async visualizeQuery(connection: PoolConnection, schemaName: string, query: string): Promise<QueryVisualization> {
    if (!query?.trim()) {
      throw new ValidationError('Query is required');
    }

    const statementType = this.parser.detectStatementType(query);
    if (statementType !== 'SELECT') {
      throw new ValidationError('Query visualization only supports SELECT statements');
    }

    return await this.visualizationService.visualizeQuery(connection, schemaName, query);
  }

  /**
   * Split SQL into individual statements
   * Supports both semicolon-separated and newline-separated (LeetCode style) SQL
   */
  private splitStatements(sql: string): string[] {
    // Check if SQL contains semicolons (traditional format)
    const hasSemicolons = sql.includes(';');

    if (hasSemicolons) {
      return this.splitBySemicolon(sql);
    } else {
      return this.splitByNewline(sql);
    }
  }

  /**
   * Split SQL by semicolons (traditional format)
   */
  private splitBySemicolon(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const prevChar = sql[i - 1];

      if (!char) continue;

      // Handle string literals
      if ((char === "'" || char === '"') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      // Split on semicolon if not in string
      if (char === ';' && !inString) {
        statements.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add remaining statement
    if (current.trim()) {
      statements.push(current.trim());
    }

    return statements.filter((s) => s.length > 0);
  }

  /**
   * Split SQL by newlines (LeetCode style - no semicolons)
   * Detects SQL keywords at the start of lines to determine statement boundaries
   */
  private splitByNewline(sql: string): string[] {
    const lines = sql.split(/\r?\n/);
    const statements: string[] = [];
    let currentStatement = '';

    // SQL keywords that typically start a new statement
    const statementStarters = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|WITH|SET|SHOW|DESCRIBE|EXPLAIN|USE|GRANT|REVOKE)\b/i;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;

      // Check if this line starts a new SQL statement
      if (statementStarters.test(trimmedLine)) {
        // Save the previous statement if exists
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        currentStatement = trimmedLine;
      } else {
        // Continue the current statement (for multi-line statements)
        currentStatement += ' ' + trimmedLine;
      }
    }

    // Don't forget the last statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements.filter((s) => s.length > 0);
  }
}
