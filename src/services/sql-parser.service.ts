// ==========================================
// SQL Parser Service
// Parses SQL queries and extracts execution order
// ==========================================

import type {
  ExecutionStep,
  ExecutionStepType,
  ParsedSelectQuery,
  ColumnDefinition,
  ParsedCreateTableQuery,
} from '../types/index.js';
import { SQLParseError } from '../utils/errors.js';

export class SQLParserService {
  /**
   * Extract the logical execution order from a SELECT query
   * SQL logical execution order:
   * 1. FROM (and JOINs)
   * 2. WHERE
   * 3. GROUP BY
   * 4. HAVING
   * 5. SELECT
   * 6. DISTINCT
   * 7. ORDER BY
   * 8. LIMIT / OFFSET
   */
  parseExecutionOrder(query: string): ExecutionStep[] {
    const normalizedQuery = this.normalizeQuery(query);
    const steps: ExecutionStep[] = [];
    let order = 1;

    // Check if it's a SELECT query
    if (!normalizedQuery.toUpperCase().trim().startsWith('SELECT')) {
      throw new SQLParseError('Execution order visualization only supports SELECT queries', query);
    }

    // Extract FROM clause
    const fromMatch = normalizedQuery.match(/\bFROM\s+([^WHERE|JOIN|GROUP|ORDER|HAVING|LIMIT|;]+)/i);
    if (fromMatch?.[1]) {
      steps.push({
        order: order++,
        type: 'FROM',
        clause: `FROM ${fromMatch[1].trim()}`,
        description: 'Load data from table(s)',
      });
    }

    // Extract JOIN clauses
    const joinMatches = normalizedQuery.match(/\b((?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+\w+(?:\s+(?:AS\s+)?\w+)?(?:\s+ON\s+[^WHERE|JOIN|GROUP|ORDER|HAVING|LIMIT|;]+)?)/gi);
    if (joinMatches) {
      for (const joinClause of joinMatches) {
        steps.push({
          order: order++,
          type: 'JOIN',
          clause: joinClause.trim(),
          description: 'Combine rows from joined tables',
        });
      }
    }

    // Extract WHERE clause
    const whereMatch = normalizedQuery.match(/\bWHERE\s+(.+?)(?=\s+GROUP\s+BY|\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|\s*;|\s*$)/i);
    if (whereMatch?.[1]) {
      steps.push({
        order: order++,
        type: 'WHERE',
        clause: `WHERE ${whereMatch[1].trim()}`,
        description: 'Filter rows based on conditions',
      });
    }

    // Extract GROUP BY clause
    const groupByMatch = normalizedQuery.match(/\bGROUP\s+BY\s+(.+?)(?=\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|\s*;|\s*$)/i);
    if (groupByMatch?.[1]) {
      steps.push({
        order: order++,
        type: 'GROUP BY',
        clause: `GROUP BY ${groupByMatch[1].trim()}`,
        description: 'Group rows by specified columns',
      });
    }

    // Extract HAVING clause
    const havingMatch = normalizedQuery.match(/\bHAVING\s+(.+?)(?=\s+ORDER\s+BY|\s+LIMIT|\s*;|\s*$)/i);
    if (havingMatch?.[1]) {
      steps.push({
        order: order++,
        type: 'HAVING',
        clause: `HAVING ${havingMatch[1].trim()}`,
        description: 'Filter groups based on aggregate conditions',
      });
    }

    // Extract SELECT clause (columns)
    const selectMatch = normalizedQuery.match(/^SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM/i);
    if (selectMatch?.[2]) {
      steps.push({
        order: order++,
        type: 'SELECT',
        clause: `SELECT ${selectMatch[2].trim()}`,
        description: 'Select specified columns',
      });

      // Check for DISTINCT
      if (selectMatch[1]) {
        steps.push({
          order: order++,
          type: 'DISTINCT',
          clause: 'DISTINCT',
          description: 'Remove duplicate rows',
        });
      }
    }

    // Extract ORDER BY clause
    const orderByMatch = normalizedQuery.match(/\bORDER\s+BY\s+(.+?)(?=\s+LIMIT|\s*;|\s*$)/i);
    if (orderByMatch?.[1]) {
      steps.push({
        order: order++,
        type: 'ORDER BY',
        clause: `ORDER BY ${orderByMatch[1].trim()}`,
        description: 'Sort result rows',
      });
    }

    // Extract LIMIT clause
    const limitMatch = normalizedQuery.match(/\bLIMIT\s+(\d+)/i);
    if (limitMatch?.[1]) {
      steps.push({
        order: order++,
        type: 'LIMIT',
        clause: `LIMIT ${limitMatch[1]}`,
        description: `Limit results to ${limitMatch[1]} rows`,
      });
    }

    // Extract OFFSET clause
    const offsetMatch = normalizedQuery.match(/\bOFFSET\s+(\d+)/i);
    if (offsetMatch?.[1]) {
      steps.push({
        order: order++,
        type: 'OFFSET',
        clause: `OFFSET ${offsetMatch[1]}`,
        description: `Skip first ${offsetMatch[1]} rows`,
      });
    }

    if (steps.length === 0) {
      throw new SQLParseError('Could not parse query execution steps', query);
    }

    return steps;
  }

  /**
   * Parse a SELECT query into structured components
   */
  parseSelectQuery(query: string): ParsedSelectQuery {
    const normalizedQuery = this.normalizeQuery(query);

    if (!normalizedQuery.toUpperCase().trim().startsWith('SELECT')) {
      throw new SQLParseError('Expected SELECT query', query);
    }

    const result: ParsedSelectQuery = {
      type: 'SELECT',
      columns: [],
      isDistinct: false,
      from: [],
      joins: [],
    };

    // Check for DISTINCT
    result.isDistinct = /^SELECT\s+DISTINCT/i.test(normalizedQuery);

    // Extract columns
    const selectMatch = normalizedQuery.match(/^SELECT\s+(?:DISTINCT\s+)?(.+?)\s+FROM/i);
    if (selectMatch?.[1]) {
      result.columns = this.parseColumnList(selectMatch[1]);
    }

    // Extract FROM tables
    const fromMatch = normalizedQuery.match(/\bFROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/i);
    if (fromMatch) {
      result.from.push({
        table: fromMatch[1] ?? '',
        alias: fromMatch[2],
      });
    }

    // Extract JOINs
    const joinRegex = /\b(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+([^JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT]+)/gi;
    let joinMatch;
    while ((joinMatch = joinRegex.exec(normalizedQuery)) !== null) {
      result.joins.push({
        type: (joinMatch[1]?.toUpperCase() as 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS') ?? 'INNER',
        table: joinMatch[2] ?? '',
        alias: joinMatch[3],
        on: joinMatch[4]?.trim(),
      });
    }

    // Extract WHERE
    const whereMatch = normalizedQuery.match(/\bWHERE\s+(.+?)(?=\s+GROUP\s+BY|\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|\s*;|\s*$)/i);
    if (whereMatch?.[1]) {
      result.where = whereMatch[1].trim();
    }

    // Extract GROUP BY
    const groupByMatch = normalizedQuery.match(/\bGROUP\s+BY\s+(.+?)(?=\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|\s*;|\s*$)/i);
    if (groupByMatch?.[1]) {
      result.groupBy = this.parseColumnList(groupByMatch[1]);
    }

    // Extract HAVING
    const havingMatch = normalizedQuery.match(/\bHAVING\s+(.+?)(?=\s+ORDER\s+BY|\s+LIMIT|\s*;|\s*$)/i);
    if (havingMatch?.[1]) {
      result.having = havingMatch[1].trim();
    }

    // Extract ORDER BY
    const orderByMatch = normalizedQuery.match(/\bORDER\s+BY\s+(.+?)(?=\s+LIMIT|\s*;|\s*$)/i);
    if (orderByMatch?.[1]) {
      result.orderBy = this.parseOrderBy(orderByMatch[1]);
    }

    // Extract LIMIT
    const limitMatch = normalizedQuery.match(/\bLIMIT\s+(\d+)/i);
    if (limitMatch?.[1]) {
      result.limit = parseInt(limitMatch[1], 10);
    }

    // Extract OFFSET
    const offsetMatch = normalizedQuery.match(/\bOFFSET\s+(\d+)/i);
    if (offsetMatch?.[1]) {
      result.offset = parseInt(offsetMatch[1], 10);
    }

    return result;
  }

  /**
   * Parse CREATE TABLE statement
   */
  parseCreateTable(query: string): ParsedCreateTableQuery {
    const normalizedQuery = this.normalizeQuery(query);

    const tableNameMatch = normalizedQuery.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    if (!tableNameMatch?.[1]) {
      throw new SQLParseError('Could not parse table name from CREATE TABLE', query);
    }

    const tableName = tableNameMatch[1];

    // Extract columns definition
    const columnsMatch = normalizedQuery.match(/\(([^)]+)\)/);
    if (!columnsMatch?.[1]) {
      throw new SQLParseError('Could not parse column definitions', query);
    }

    const columns = this.parseColumnDefinitions(columnsMatch[1]);

    return {
      type: 'CREATE TABLE',
      tableName,
      columns,
    };
  }

  /**
   * Detect the type of SQL statement
   */
  detectStatementType(query: string): string {
    const normalizedQuery = this.normalizeQuery(query).toUpperCase().trim();

    if (normalizedQuery.startsWith('SELECT')) return 'SELECT';
    if (normalizedQuery.startsWith('INSERT')) return 'INSERT';
    if (normalizedQuery.startsWith('UPDATE')) return 'UPDATE';
    if (normalizedQuery.startsWith('DELETE')) return 'DELETE';
    if (normalizedQuery.startsWith('CREATE TABLE')) return 'CREATE TABLE';
    if (normalizedQuery.startsWith('DROP TABLE')) return 'DROP TABLE';
    if (normalizedQuery.startsWith('ALTER TABLE')) return 'ALTER TABLE';
    if (normalizedQuery.startsWith('CREATE INDEX')) return 'CREATE INDEX';

    return 'UNKNOWN';
  }

  /**
   * Get a description for the execution step type
   */
  getStepDescription(type: ExecutionStepType): string {
    const descriptions: Record<ExecutionStepType, string> = {
      FROM: 'Load data from the specified table(s)',
      JOIN: 'Combine rows from multiple tables based on join conditions',
      WHERE: 'Filter rows that match the specified conditions',
      'GROUP BY': 'Group rows with the same values in specified columns',
      HAVING: 'Filter groups based on aggregate function conditions',
      SELECT: 'Choose which columns to include in the result',
      DISTINCT: 'Remove duplicate rows from the result',
      'ORDER BY': 'Sort the result set by specified columns',
      LIMIT: 'Restrict the number of rows returned',
      OFFSET: 'Skip a specified number of rows before returning results',
    };

    return descriptions[type] || 'Process data';
  }

  // Private helper methods

  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
  }

  private parseColumnList(columnStr: string): string[] {
    // Handle simple column lists (not accounting for complex expressions with commas in functions)
    return columnStr
      .split(',')
      .map((col) => col.trim())
      .filter((col) => col.length > 0);
  }

  private parseOrderBy(orderByStr: string): { column: string; direction: 'ASC' | 'DESC' }[] {
    return orderByStr.split(',').map((item) => {
      const parts = item.trim().split(/\s+/);
      return {
        column: parts[0] ?? '',
        direction: (parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
      };
    });
  }

  private parseColumnDefinitions(columnsStr: string): ColumnDefinition[] {
    const columns: ColumnDefinition[] = [];

    // Split by comma, but be careful with REFERENCES clauses
    const columnDefs = this.splitColumnDefinitions(columnsStr);

    for (const def of columnDefs) {
      const trimmedDef = def.trim();

      // Skip table-level constraints
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)/i.test(trimmedDef)) {
        continue;
      }

      const column = this.parseColumnDefinition(trimmedDef);
      if (column) {
        columns.push(column);
      }
    }

    return columns;
  }

  private splitColumnDefinitions(columnsStr: string): string[] {
    const result: string[] = [];
    let current = '';
    let parenDepth = 0;

    for (const char of columnsStr) {
      if (char === '(') {
        parenDepth++;
        current += char;
      } else if (char === ')') {
        parenDepth--;
        current += char;
      } else if (char === ',' && parenDepth === 0) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      result.push(current);
    }

    return result;
  }

  private parseColumnDefinition(def: string): ColumnDefinition | null {
    const parts = def.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const name = parts[0];
    // Handle backtick-quoted names (MySQL style)
    const cleanName = name?.replace(/`/g, '');
    const type = parts[1];

    if (!cleanName || !type) return null;

    const upperDef = def.toUpperCase();

    const column: ColumnDefinition = {
      name: cleanName,
      type,
      isPrimaryKey: upperDef.includes('PRIMARY KEY'),
      isForeignKey: upperDef.includes('REFERENCES'),
      isNotNull: upperDef.includes('NOT NULL'),
      isUnique: upperDef.includes('UNIQUE'),
    };

    // Extract default value
    const defaultMatch = def.match(/DEFAULT\s+([^\s,]+)/i);
    if (defaultMatch?.[1]) {
      column.defaultValue = defaultMatch[1];
    }

    // Extract references (MySQL style with backticks or without)
    const refMatch = def.match(/REFERENCES\s+`?(\w+)`?\s*\(`?(\w+)`?\)/i);
    if (refMatch) {
      column.references = {
        table: refMatch[1] ?? '',
        column: refMatch[2] ?? '',
      };
    }

    return column;
  }

  /**
   * Convert SQLite syntax to MySQL syntax
   * Handles common differences like AUTOINCREMENT → AUTO_INCREMENT
   */
  convertToMySQLSyntax(sql: string): string {
    let converted = sql;

    // AUTOINCREMENT → AUTO_INCREMENT
    converted = converted.replace(/\bAUTOINCREMENT\b/gi, 'AUTO_INCREMENT');

    // INTEGER PRIMARY KEY → INT PRIMARY KEY AUTO_INCREMENT (for MySQL auto-increment pattern)
    // Note: This is a simplistic conversion, real-world might need more sophisticated handling
    converted = converted.replace(
      /\bINTEGER\s+PRIMARY\s+KEY\b/gi,
      'INT PRIMARY KEY AUTO_INCREMENT'
    );

    // BOOLEAN → TINYINT(1) - MySQL doesn't have native BOOLEAN type
    // (Actually MySQL accepts BOOLEAN as alias for TINYINT(1), so this is optional)

    // TEXT → TEXT (same in both)
    // REAL → DOUBLE (MySQL equivalent)
    converted = converted.replace(/\bREAL\b/gi, 'DOUBLE');

    // BLOB → BLOB (same in both)

    return converted;
  }
}
