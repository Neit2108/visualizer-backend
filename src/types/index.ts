// ==========================================
// SQL Visualization Types
// ==========================================

import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

// MySQL Types Re-exports
export type MySQLPool = Pool;
export type MySQLConnection = PoolConnection;
export type MySQLResultSetHeader = ResultSetHeader;
export type MySQLRowDataPacket = RowDataPacket;

// Session Types
export interface Session {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
}

// Table Schema Types
export interface ColumnDefinition {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  defaultValue?: string | undefined;
  references?: {
    table: string;
    column: string;
  } | undefined;
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
}

export interface TableData {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

// ER Diagram Types
export interface ERRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface ERDiagram {
  tables: TableSchema[];
  relationships: ERRelationship[];
}

// SQL Execution Order Types (for SELECT queries)
export type ExecutionStepType =
  | 'FROM'
  | 'JOIN'
  | 'WHERE'
  | 'GROUP BY'
  | 'HAVING'
  | 'SELECT'
  | 'DISTINCT'
  | 'ORDER BY'
  | 'LIMIT'
  | 'OFFSET';

export interface ExecutionStep {
  order: number;
  type: ExecutionStepType;
  clause: string;
  description: string;
}

// Data Flow Types
export interface RowState {
  data: Record<string, unknown>;
  included: boolean;
  excludedReason?: string | undefined;
}

export interface DataFlowStep {
  stepOrder: number;
  stepType: ExecutionStepType;
  rows: RowState[];
  columns: string[];
  description: string;
  stats: {
    totalRows: number;
    includedRows: number;
    excludedRows: number;
  };
}

export interface QueryVisualization {
  originalQuery: string;
  executionSteps: ExecutionStep[];
  dataFlow: DataFlowStep[];
  finalResult: TableData;
}

// API Request/Response Types
export interface ExecuteSQLRequest {
  sessionId: string;
  sql: string;
}

export interface ExecuteSQLResponse {
  success: boolean;
  message: string;
  affectedTables?: string[];
  data?: TableData;
}

export interface GetTablesRequest {
  sessionId: string;
}

export interface GetTablesResponse {
  tables: TableSchema[];
  tableData: TableData[];
  erDiagram?: ERDiagram | undefined;
}

export interface VisualizeQueryRequest {
  sessionId: string;
  query: string;
}

export interface VisualizeQueryResponse {
  visualization: QueryVisualization;
}

export interface CreateSessionResponse {
  sessionId: string;
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Parsed SQL Query Types
export interface ParsedSelectQuery {
  type: 'SELECT';
  columns: string[];
  isDistinct: boolean;
  from: {
    table: string;
    alias?: string | undefined;
  }[];
  joins: {
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
    table: string;
    alias?: string | undefined;
    on?: string | undefined;
  }[];
  where?: string | undefined;
  groupBy?: string[] | undefined;
  having?: string | undefined;
  orderBy?: {
    column: string;
    direction: 'ASC' | 'DESC';
  }[] | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface ParsedCreateTableQuery {
  type: 'CREATE TABLE';
  tableName: string;
  columns: ColumnDefinition[];
}

export interface ParsedInsertQuery {
  type: 'INSERT';
  tableName: string;
  columns?: string[];
  values: unknown[][];
}

export interface ParsedUpdateQuery {
  type: 'UPDATE';
  tableName: string;
  set: Record<string, unknown>;
  where?: string;
}

export interface ParsedDeleteQuery {
  type: 'DELETE';
  tableName: string;
  where?: string;
}

export type ParsedQuery =
  | ParsedSelectQuery
  | ParsedCreateTableQuery
  | ParsedInsertQuery
  | ParsedUpdateQuery
  | ParsedDeleteQuery;

// Feedback Types
export interface Feedback {
  id: number;
  sessionId?: string | undefined;
  email: string;
  rating: number; // 1-5 stars
  category: 'bug' | 'feature' | 'improvement' | 'other';
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeedbackRequest {
  sessionId?: string;
  email: string;
  rating: number;
  category: 'bug' | 'feature' | 'improvement' | 'other';
  message: string;
}

export interface FeedbackResponse {
  id: number;
  email: string;
  rating: number;
  category: string;
  message: string;
  createdAt: string;
}

export interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  categoryBreakdown: Record<string, number>;
}

// Sessions management types
export interface CreateSessionManagementRequest {
  sessionId: string;
  schemaName: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'deleted';
  clientIp: string;
  userAgent: string;
  queryCount: number;
  tableCount: number;
}

export interface CreateSessionClientInfo {
  clientIp?: string;
  userAgent?: string;
}