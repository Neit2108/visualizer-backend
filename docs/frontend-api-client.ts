/**
 * SQL Visualization API Client
 * 
 * Copy this file into your frontend project: src/api/sqlVisualizationApi.ts
 * 
 * Usage:
 *   import { api } from './api/sqlVisualizationApi';
 *   
 *   const { sessionId } = await api.createSession();
 *   await api.executeSQL(sessionId, 'CREATE TABLE users ...');
 *   const { visualization } = await api.visualizeQuery(sessionId, 'SELECT * FROM users');
 */

import type {
  ApiResponse,
  ApiError,
  Session,
  CreateSessionResponse,
  SessionStatsResponse,
  ExecuteSQLResponse,
  GetTablesResponse,
  TableData,
  VisualizeQueryResponse,
} from './types';

// ============================================
// Configuration
// ============================================

const DEFAULT_BASE_URL = 'http://localhost:3000';

interface ApiClientConfig {
  baseUrl?: string;
  onError?: (error: ApiError) => void;
  onSessionExpired?: () => void;
}

let config: ApiClientConfig = {
  baseUrl: DEFAULT_BASE_URL,
};

/**
 * Configure the API client
 */
export function configureApi(newConfig: ApiClientConfig): void {
  config = { ...config, ...newConfig };
}

// ============================================
// Error Handling
// ============================================

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ============================================
// Request Helper
// ============================================

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${config.baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      const error = data.error || { code: 'UNKNOWN_ERROR', message: 'Unknown error' };
      
      // Handle session expiration
      if (error.code === 'SESSION_NOT_FOUND' && config.onSessionExpired) {
        config.onSessionExpired();
      }
      
      // Call error handler if configured
      if (config.onError) {
        config.onError(error);
      }
      
      throw new ApiClientError(error.code, error.message, error.details);
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    
    // Network error or JSON parse error
    const networkError = new ApiClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    );
    
    if (config.onError) {
      config.onError({ code: 'NETWORK_ERROR', message: networkError.message });
    }
    
    throw networkError;
  }
}

// ============================================
// API Methods
// ============================================

export const api = {
  // ==================== Sessions ====================

  /**
   * Create a new session with an isolated SQLite database
   * 
   * @returns Promise with the new sessionId
   * 
   * @example
   * const { sessionId } = await api.createSession();
   * localStorage.setItem('sessionId', sessionId);
   */
  createSession: (): Promise<CreateSessionResponse> =>
    request<CreateSessionResponse>('/api/sessions', { method: 'POST' }),

  /**
   * Get session information
   * 
   * @param sessionId - The session ID to look up
   * @returns Promise with session details
   * 
   * @example
   * const session = await api.getSession(sessionId);
   * console.log(`Session created: ${session.createdAt}`);
   */
  getSession: (sessionId: string): Promise<Session> =>
    request<Session>(`/api/sessions/${sessionId}`),

  /**
   * Delete a session and its database
   * 
   * @param sessionId - The session ID to delete
   * @returns Promise with deletion confirmation
   * 
   * @example
   * await api.deleteSession(sessionId);
   * localStorage.removeItem('sessionId');
   */
  deleteSession: (sessionId: string): Promise<{ deleted: boolean }> =>
    request<{ deleted: boolean }>(`/api/sessions/${sessionId}`, { method: 'DELETE' }),

  /**
   * List all active sessions (for debugging/admin)
   * 
   * @returns Promise with session statistics
   * 
   * @example
   * const { activeSessionCount, sessions } = await api.listSessions();
   */
  listSessions: (): Promise<SessionStatsResponse> =>
    request<SessionStatsResponse>('/api/sessions'),

  // ==================== SQL Execution ====================

  /**
   * Execute a single SQL statement
   * 
   * @param sessionId - The session to execute against
   * @param sql - SQL statement to execute
   * @returns Promise with execution result
   * 
   * @example
   * // CREATE TABLE
   * const result = await api.executeSQL(sessionId, 
   *   'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)'
   * );
   * console.log(result.message); // "Table 'users' created successfully"
   * 
   * // SELECT (returns data)
   * const selectResult = await api.executeSQL(sessionId, 'SELECT * FROM users');
   * console.log(selectResult.data?.rows); // [{ id: 1, name: 'Alice' }, ...]
   */
  executeSQL: (sessionId: string, sql: string): Promise<ExecuteSQLResponse> =>
    request<ExecuteSQLResponse>('/api/sql/execute', {
      method: 'POST',
      body: JSON.stringify({ sessionId, sql }),
    }),

  /**
   * Execute multiple SQL statements separated by semicolons
   * 
   * @param sessionId - The session to execute against
   * @param sql - Multiple SQL statements separated by ;
   * @returns Promise with array of results for each statement
   * 
   * @example
   * const results = await api.executeMultipleSQL(sessionId, `
   *   CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
   *   INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');
   *   SELECT * FROM users;
   * `);
   * 
   * results.forEach((result, i) => {
   *   console.log(`Statement ${i + 1}: ${result.message}`);
   * });
   */
  executeMultipleSQL: (sessionId: string, sql: string): Promise<ExecuteSQLResponse[]> =>
    request<ExecuteSQLResponse[]>('/api/sql/execute-multiple', {
      method: 'POST',
      body: JSON.stringify({ sessionId, sql }),
    }),

  // ==================== Tables ====================

  /**
   * Get all tables with their schemas, data, and ER diagram
   * 
   * @param sessionId - The session to query
   * @returns Promise with tables, data, and optional ER diagram
   * 
   * @example
   * const { tables, tableData, erDiagram } = await api.getTables(sessionId);
   * 
   * // Show table list
   * tables.forEach(table => console.log(table.name));
   * 
   * // Show ER diagram (only if 2+ tables)
   * if (erDiagram) {
   *   erDiagram.relationships.forEach(rel => {
   *     console.log(`${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn}`);
   *   });
   * }
   */
  getTables: (sessionId: string): Promise<GetTablesResponse> =>
    request<GetTablesResponse>(`/api/sql/tables/${sessionId}`),

  /**
   * Get data for a specific table
   * 
   * @param sessionId - The session to query
   * @param tableName - Name of the table
   * @returns Promise with table data
   * 
   * @example
   * const { columns, rows } = await api.getTableData(sessionId, 'users');
   * console.log(`Columns: ${columns.join(', ')}`);
   * console.log(`Rows: ${rows.length}`);
   */
  getTableData: (sessionId: string, tableName: string): Promise<TableData> =>
    request<TableData>(`/api/sql/tables/${sessionId}/${tableName}`),

  // ==================== Visualization ====================

  /**
   * Visualize the execution of a SELECT query
   * 
   * @param sessionId - The session to query
   * @param query - SELECT query to visualize
   * @returns Promise with complete visualization data
   * 
   * @example
   * const { visualization } = await api.visualizeQuery(
   *   sessionId,
   *   'SELECT * FROM users WHERE age > 21 ORDER BY name'
   * );
   * 
   * // Get execution steps for stepper UI
   * visualization.executionSteps.forEach(step => {
   *   console.log(`${step.order}. ${step.type}: ${step.clause}`);
   * });
   * 
   * // Get data flow for each step
   * visualization.dataFlow.forEach(step => {
   *   console.log(`Step ${step.stepOrder}: ${step.stats.includedRows}/${step.stats.totalRows} rows`);
   *   step.rows.forEach(row => {
   *     if (!row.included) {
   *       console.log(`  Excluded: ${row.excludedReason}`);
   *     }
   *   });
   * });
   */
  visualizeQuery: (sessionId: string, query: string): Promise<VisualizeQueryResponse> =>
    request<VisualizeQueryResponse>('/api/sql/visualize', {
      method: 'POST',
      body: JSON.stringify({ sessionId, query }),
    }),

  // ==================== Health ====================

  /**
   * Check if the API server is healthy
   * 
   * @returns Promise with health status
   * 
   * @example
   * const health = await api.healthCheck();
   * console.log(`Server status: ${health.status}`);
   */
  healthCheck: (): Promise<{ status: string; timestamp: string }> =>
    request<{ status: string; timestamp: string }>('/api/health'),
};

// ============================================
// Convenience Functions
// ============================================

/**
 * Initialize a session, checking for an existing one first
 * 
 * @param storageKey - localStorage key to store/retrieve sessionId
 * @returns Promise with the sessionId
 * 
 * @example
 * const sessionId = await initSession();
 * // Now use sessionId for all API calls
 */
export async function initSession(storageKey = 'sql-viz-session-id'): Promise<string> {
  // Check for existing session
  const existingSessionId = localStorage.getItem(storageKey);
  
  if (existingSessionId) {
    try {
      await api.getSession(existingSessionId);
      return existingSessionId; // Session still valid
    } catch {
      // Session expired, will create new one
      localStorage.removeItem(storageKey);
    }
  }
  
  // Create new session
  const { sessionId } = await api.createSession();
  localStorage.setItem(storageKey, sessionId);
  return sessionId;
}

/**
 * Execute SQL and automatically refresh tables
 * 
 * @param sessionId - The session to use
 * @param sql - SQL to execute
 * @param onTablesUpdate - Callback with updated tables
 * 
 * @example
 * await executeAndRefresh(sessionId, 'INSERT INTO users ...', (tables) => {
 *   setTables(tables);
 * });
 */
export async function executeAndRefresh(
  sessionId: string,
  sql: string,
  onTablesUpdate?: (response: GetTablesResponse) => void
): Promise<ExecuteSQLResponse> {
  const result = await api.executeSQL(sessionId, sql);
  
  if (onTablesUpdate) {
    const tables = await api.getTables(sessionId);
    onTablesUpdate(tables);
  }
  
  return result;
}

// ============================================
// Export Types (re-export for convenience)
// ============================================

export type {
  ApiResponse,
  ApiError,
  Session,
  CreateSessionResponse,
  SessionStatsResponse,
  ExecuteSQLResponse,
  GetTablesResponse,
  TableData,
  TableSchema,
  ColumnDefinition,
  ERDiagram,
  ERRelationship,
  VisualizeQueryResponse,
  QueryVisualization,
  ExecutionStep,
  ExecutionStepType,
  DataFlowStep,
  RowState,
} from './types';
