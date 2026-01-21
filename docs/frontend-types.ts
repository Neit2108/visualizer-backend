/**
 * SQL Visualization API - Frontend TypeScript Types
 * 
 * Copy this file into your frontend project: src/api/types.ts
 * 
 * Generated from backend types for type-safe API integration.
 */

// ============================================
// Base API Types
// ============================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * API error structure
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Possible API error codes
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'SQL_EXECUTION_ERROR'
  | 'SQL_PARSE_ERROR'
  | 'SESSION_NOT_FOUND'
  | 'INVALID_SESSION'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

// ============================================
// Session Types
// ============================================

/**
 * Session information
 */
export interface Session {
  id: string;
  createdAt: string;  // ISO 8601 date string
  lastAccessedAt: string;  // ISO 8601 date string
}

/**
 * Response when creating a new session
 */
export interface CreateSessionResponse {
  sessionId: string;
}

/**
 * Response for listing all sessions
 */
export interface SessionStatsResponse {
  activeSessionCount: number;
  sessions: Session[];
}

// ============================================
// Table Schema Types
// ============================================

/**
 * Column definition with constraints
 */
export interface ColumnDefinition {
  /** Column name */
  name: string;
  /** SQL data type (INTEGER, TEXT, REAL, BLOB, etc.) */
  type: string;
  /** Is this a primary key column */
  isPrimaryKey: boolean;
  /** Is this a foreign key column */
  isForeignKey: boolean;
  /** Has NOT NULL constraint */
  isNotNull: boolean;
  /** Has UNIQUE constraint */
  isUnique: boolean;
  /** Default value if specified */
  defaultValue?: string;
  /** Foreign key reference details */
  references?: {
    table: string;
    column: string;
  };
}

/**
 * Table schema with column definitions
 */
export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
}

/**
 * Table data with column names and rows
 */
export interface TableData {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

// ============================================
// ER Diagram Types
// ============================================

/**
 * Relationship cardinality types
 */
export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-many';

/**
 * Relationship between two tables
 */
export interface ERRelationship {
  /** Source table name */
  fromTable: string;
  /** Source column name (foreign key) */
  fromColumn: string;
  /** Target table name */
  toTable: string;
  /** Target column name (usually primary key) */
  toColumn: string;
  /** Relationship cardinality */
  type: RelationshipType;
}

/**
 * Complete ER diagram with tables and relationships
 */
export interface ERDiagram {
  tables: TableSchema[];
  relationships: ERRelationship[];
}

/**
 * Response for GET /api/sql/tables/:sessionId
 */
export interface GetTablesResponse {
  /** All table schemas in the database */
  tables: TableSchema[];
  /** All table data */
  tableData: TableData[];
  /** ER diagram (only present when 2+ tables exist) */
  erDiagram?: ERDiagram;
}

// ============================================
// SQL Execution Types
// ============================================

/**
 * Request body for executing SQL
 */
export interface ExecuteSQLRequest {
  sessionId: string;
  sql: string;
}

/**
 * Response from SQL execution
 */
export interface ExecuteSQLResponse {
  /** Whether the SQL executed successfully */
  success: boolean;
  /** Human-readable result message */
  message: string;
  /** Tables affected by the operation (for DDL/DML) */
  affectedTables?: string[];
  /** Query result data (for SELECT queries) */
  data?: TableData;
}

// ============================================
// Query Visualization Types
// ============================================

/**
 * SQL execution step types in logical order
 */
export type ExecutionStepType =
  | 'FROM'      // 1. Load data from tables
  | 'JOIN'      // 2. Combine tables
  | 'WHERE'     // 3. Filter rows
  | 'GROUP BY'  // 4. Group rows
  | 'HAVING'    // 5. Filter groups
  | 'SELECT'    // 6. Choose columns
  | 'DISTINCT'  // 7. Remove duplicates
  | 'ORDER BY'  // 8. Sort results
  | 'LIMIT'     // 9. Limit row count
  | 'OFFSET';   // 10. Skip rows

/**
 * Single execution step in query processing
 */
export interface ExecutionStep {
  /** Order in the execution sequence (1-based) */
  order: number;
  /** Type of operation */
  type: ExecutionStepType;
  /** The actual SQL clause */
  clause: string;
  /** Human-readable description */
  description: string;
}

/**
 * State of a single row during query execution
 */
export interface RowState {
  /** The row data */
  data: Record<string, unknown>;
  /** Whether this row is included in the result at this step */
  included: boolean;
  /** Reason why the row was excluded (if excluded) */
  excludedReason?: string;
}

/**
 * Data flow at a specific execution step
 */
export interface DataFlowStep {
  /** Step order matching ExecutionStep.order */
  stepOrder: number;
  /** Step type matching ExecutionStep.type */
  stepType: ExecutionStepType;
  /** All rows with their inclusion state */
  rows: RowState[];
  /** Column names at this step */
  columns: string[];
  /** Human-readable description */
  description: string;
  /** Statistics for this step */
  stats: {
    /** Total number of rows */
    totalRows: number;
    /** Rows included (not filtered out) */
    includedRows: number;
    /** Rows excluded (filtered out) */
    excludedRows: number;
  };
}

/**
 * Complete query visualization result
 */
export interface QueryVisualization {
  /** The original SQL query */
  originalQuery: string;
  /** Execution steps in logical order */
  executionSteps: ExecutionStep[];
  /** Data transformation at each step */
  dataFlow: DataFlowStep[];
  /** Final query result */
  finalResult: TableData;
}

/**
 * Request body for query visualization
 */
export interface VisualizeQueryRequest {
  sessionId: string;
  /** Must be a SELECT query */
  query: string;
}

/**
 * Response from query visualization
 */
export interface VisualizeQueryResponse {
  visualization: QueryVisualization;
}

// ============================================
// Utility Types for Frontend
// ============================================

/**
 * Helper type for unwrapping API responses
 */
export type UnwrapApiResponse<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Row data type (generic for any table)
 */
export type RowData = Record<string, unknown>;

/**
 * Typed row data for a specific table
 */
export type TypedRow<T extends Record<string, unknown>> = T;

// ============================================
// Constants
// ============================================

/**
 * Execution step order for reference
 */
export const EXECUTION_ORDER: ExecutionStepType[] = [
  'FROM',
  'JOIN',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'SELECT',
  'DISTINCT',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
];

/**
 * Step descriptions for UI
 */
export const STEP_DESCRIPTIONS: Record<ExecutionStepType, string> = {
  FROM: 'Load data from table(s)',
  JOIN: 'Combine rows from joined tables',
  WHERE: 'Filter rows based on conditions',
  'GROUP BY': 'Group rows by specified columns',
  HAVING: 'Filter groups based on aggregate conditions',
  SELECT: 'Choose which columns to include',
  DISTINCT: 'Remove duplicate rows',
  'ORDER BY': 'Sort the result set',
  LIMIT: 'Restrict the number of rows',
  OFFSET: 'Skip specified number of rows',
};

/**
 * Step colors for UI visualization
 */
export const STEP_COLORS: Record<ExecutionStepType, string> = {
  FROM: '#3B82F6',      // blue-500
  JOIN: '#8B5CF6',      // violet-500
  WHERE: '#EF4444',     // red-500
  'GROUP BY': '#F59E0B', // amber-500
  HAVING: '#F97316',    // orange-500
  SELECT: '#10B981',    // emerald-500
  DISTINCT: '#06B6D4',  // cyan-500
  'ORDER BY': '#6366F1', // indigo-500
  LIMIT: '#EC4899',     // pink-500
  OFFSET: '#84CC16',    // lime-500
};
