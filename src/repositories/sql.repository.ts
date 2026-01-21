// ==========================================
// SQL Repository
// Data access layer for SQL operations - MySQL
// ==========================================

import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type {
  TableSchema,
  ColumnDefinition,
  TableData,
  ERRelationship,
} from '../types/index.js';
import { SQLExecutionError } from '../utils/errors.js';

export class SQLRepository {
  constructor(
    private connection: PoolConnection,
    private schemaName: string
  ) {}

  /**
   * Execute a raw SQL statement (for DDL/DML)
   */
  async executeStatement(sql: string): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    try {
      // Ensure we're using the correct schema
      await this.connection.query(`USE \`${this.schemaName}\``);
      
      const [result] = await this.connection.query<ResultSetHeader>(sql);
      
      return {
        changes: result.affectedRows ?? 0,
        lastInsertRowid: result.insertId ?? 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SQL error';
      throw new SQLExecutionError(`SQL execution failed: ${message}`, message);
    }
  }

  /**
   * Execute a SELECT query and return results
   */
  async executeQuery<T extends Record<string, unknown> = Record<string, unknown>>(sql: string): Promise<T[]> {
    try {
      // Ensure we're using the correct schema
      await this.connection.query(`USE \`${this.schemaName}\``);
      
      const [rows] = await this.connection.query<RowDataPacket[]>(sql);
      return rows as T[];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SQL error';
      throw new SQLExecutionError(`Query execution failed: ${message}`, message);
    }
  }

  /**
   * Get all table names in the database
   */
  async getTableNames(): Promise<string[]> {
    const [rows] = await this.connection.query<RowDataPacket[]>(
      `SELECT TABLE_NAME as name 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [this.schemaName]
    );

    return rows.map((row) => row['name'] as string);
  }

  /**
   * Get schema information for a specific table
   */
  async getTableSchema(tableName: string): Promise<TableSchema> {
    // Get column information
    const [columns] = await this.connection.query<RowDataPacket[]>(
      `SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_KEY as columnKey,
        COLUMN_DEFAULT as defaultValue,
        EXTRA as extra
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [this.schemaName, tableName]
    );

    // Get foreign key information
    const [foreignKeys] = await this.connection.query<RowDataPacket[]>(
      `SELECT 
        COLUMN_NAME as fromColumn,
        REFERENCED_TABLE_NAME as toTable,
        REFERENCED_COLUMN_NAME as toColumn
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [this.schemaName, tableName]
    );

    // Get unique constraints
    const [uniqueConstraints] = await this.connection.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME as name
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = ?
         AND NON_UNIQUE = 0`,
      [this.schemaName, tableName]
    );

    const uniqueColumns = new Set<string>(
      uniqueConstraints.map((row) => row['name'] as string)
    );

    const fkMap = new Map<string, { table: string; column: string }>();
    for (const fk of foreignKeys) {
      fkMap.set(fk['fromColumn'] as string, {
        table: fk['toTable'] as string,
        column: fk['toColumn'] as string,
      });
    }

    const columnDefs: ColumnDefinition[] = columns.map((col) => {
      const fk = fkMap.get(col['name'] as string);
      const isPrimaryKey = col['columnKey'] === 'PRI';
      const isForeignKey = col['columnKey'] === 'MUL' && fk !== undefined;

      return {
        name: col['name'] as string,
        type: col['type'] as string,
        isPrimaryKey,
        isForeignKey,
        isNotNull: col['nullable'] === 'NO',
        isUnique: uniqueColumns.has(col['name'] as string) || isPrimaryKey,
        defaultValue: col['defaultValue'] as string | undefined,
        ...(fk && { references: fk }),
      };
    });

    return {
      name: tableName,
      columns: columnDefs,
    };
  }

  /**
   * Get all data from a table
   */
  async getTableData(tableName: string): Promise<TableData> {
    await this.connection.query(`USE \`${this.schemaName}\``);
    
    const [rows] = await this.connection.query<RowDataPacket[]>(
      `SELECT * FROM \`${tableName}\``
    );
    
    const columns = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];

    // If no rows, get column names from schema
    if (columns.length === 0) {
      const schema = await this.getTableSchema(tableName);
      return {
        tableName,
        columns: schema.columns.map((c) => c.name),
        rows: [],
      };
    }

    return {
      tableName,
      columns,
      rows: rows as Record<string, unknown>[],
    };
  }

  /**
   * Get relationships between tables for ER diagram
   */
  async getRelationships(): Promise<ERRelationship[]> {
    const [foreignKeys] = await this.connection.query<RowDataPacket[]>(
      `SELECT 
        TABLE_NAME as fromTable,
        COLUMN_NAME as fromColumn,
        REFERENCED_TABLE_NAME as toTable,
        REFERENCED_COLUMN_NAME as toColumn
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [this.schemaName]
    );

    const relationships: ERRelationship[] = [];

    for (const fk of foreignKeys) {
      // Check if the foreign key column is also a primary key (indicating 1:1)
      const [pkInfo] = await this.connection.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
           AND CONSTRAINT_NAME = 'PRIMARY'`,
        [this.schemaName, fk['fromTable'], fk['fromColumn']]
      );

      const isUnique = pkInfo.length > 0;

      relationships.push({
        fromTable: fk['fromTable'] as string,
        fromColumn: fk['fromColumn'] as string,
        toTable: fk['toTable'] as string,
        toColumn: fk['toColumn'] as string,
        type: isUnique ? 'one-to-one' : 'one-to-many',
      });
    }

    return relationships;
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const [rows] = await this.connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [this.schemaName, tableName]
    );

    return ((rows[0]?.['count'] as number) ?? 0) > 0;
  }

  /**
   * Get row count for a table
   */
  async getRowCount(tableName: string): Promise<number> {
    await this.connection.query(`USE \`${this.schemaName}\``);
    
    const [rows] = await this.connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM \`${tableName}\``
    );
    
    return (rows[0]?.['count'] as number) ?? 0;
  }

  /**
   * Release the connection back to the pool
   */
  release(): void {
    this.connection.release();
  }
}
