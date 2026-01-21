// ==========================================
// Database Configuration - MySQL
// ==========================================

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type { CreateSessionManagementRequest } from 'src/types/index.js';

// MySQL Connection Pool Configuration
const poolConfig: mysql.PoolOptions = {
  host: process.env['MYSQL_HOST'] ?? 'localhost',
  port: parseInt(process.env['MYSQL_PORT'] ?? '3306', 10),
  user: process.env['MYSQL_USER'] ?? 'root',
  password: process.env['MYSQL_PASSWORD'] ?? '',
  database: process.env['MYSQL_DATABASE'] ?? 'sql_visualization',
  waitForConnections: true,
  connectionLimit: parseInt(process.env['MYSQL_POOL_SIZE'] ?? '10', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Create the connection pool
let pool: Pool | null = null;

/**
 * Get the MySQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }
  return pool;
}

/**
 * Initialize the database connection and ensure the main database exists
 */
export async function initializeDatabase(): Promise<void> {
  // First, connect without specifying a database to create it if needed
  const initPool = mysql.createPool({
    ...poolConfig,
    database: '', // Connect without database first
  });

  try {
    const connection = await initPool.getConnection();
    
    // Create the main database if it doesn't exist
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${poolConfig.database}\``
    );
    
    connection.release();
    await initPool.end();
    
    // Now initialize the main pool
    pool = mysql.createPool(poolConfig);
    
    // Test the connection
    const testConnection = await pool.getConnection();
    testConnection.release();
    
    console.log(`MySQL connected to database: ${poolConfig.database}`);
  } catch (error) {
    console.error('Failed to initialize MySQL database:', error);
    throw error;
  }
}

/**
 * Create a schema (database) for a session
 * Each session gets its own isolated database
 */
export async function createSessionSchema(sessionId: string): Promise<string> {
  const schemaName = getSessionSchemaName(sessionId);
  const connection = await getPool().getConnection();
  
  try {
    // Create the session database
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${schemaName}\``);
    
    console.log(`Created session schema: ${schemaName}`);
    return schemaName;
  } finally {
    connection.release();
  }
}

/**
 * Create a session management record
 */
export async function createSessionManagement(request: CreateSessionManagementRequest): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    // Insert the session management record into the sessions table in the main database
    await connection.query(`INSERT INTO sessions (id, schema_name, created_at, last_accessed_at, expires_at, status, client_ip, user_agent, query_count, table_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [request.sessionId, request.schemaName, request.createdAt, request.lastAccessedAt, request.expiresAt, request.status, request.clientIp, request.userAgent, request.queryCount, request.tableCount]);
  } finally {
    connection.release();
  }
}

/**
 * Update session access time and extend expiration
 * Called when SQL is executed on a session
 * @param schemaName - The schema name of the session
 * @param extendMinutes - Minutes to extend expiration (default: 30)
 */
export async function updateSessionAccess(schemaName: string, extendMinutes: number = 30): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + extendMinutes * 60 * 1000);

    await connection.query(
      `UPDATE sessions 
       SET last_accessed_at = ?, 
           expires_at = ? 
       WHERE schema_name = ? AND status = 'active'`,
      [now, newExpiresAt, schemaName]
    );
  } finally {
    connection.release();
  }
}

/**
 * Drop a session's schema (database)
 */
export async function dropSessionSchema(sessionId: string): Promise<boolean> {
  const schemaName = getSessionSchemaName(sessionId);
  const connection = await getPool().getConnection();
  
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${schemaName}\``);
    console.log(`Dropped session schema: ${schemaName}`);
    return true;
  } catch (error) {
    console.error(`Error dropping session schema ${schemaName}:`, error);
    return false;
  } finally {
    connection.release();
  }
}

/**
 * Get a connection for a specific session's database
 */
export async function getSessionConnection(sessionId: string): Promise<PoolConnection> {
  const schemaName = getSessionSchemaName(sessionId);
  const connection = await getPool().getConnection();
  
  // Switch to the session's database
  await connection.query(`USE \`${schemaName}\``);
  
  return connection;
}

/**
 * Generate consistent schema name for a session
 */
export function getSessionSchemaName(sessionId: string): string {
  // Replace hyphens with underscores for MySQL compatibility
  const sanitizedId = sessionId.replace(/-/g, '_');
  return `session_${sanitizedId}`;
}

/**
 * Check if a session schema exists
 */
export async function sessionSchemaExists(sessionId: string): Promise<boolean> {
  const schemaName = getSessionSchemaName(sessionId);
  const connection = await getPool().getConnection();
  
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [schemaName]
    );
    return rows.length > 0;
  } finally {
    connection.release();
  }
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL pool closed');
  }
}

/**
 * Get database connection pool statistics
 */
export interface PoolStatistics {
  active: number;
  idle: number;
  waiting: number;
  total: number;
  limit: number;
  utilization: number; // percentage
}

export function getPoolStatistics(): PoolStatistics | null {
  if (!pool) {
    return null;
  }

  // MySQL2 pool doesn't expose these directly, so we need to estimate
  // The pool object has internal state we can't access directly
  // We'll use a test connection approach to get approximate stats
  const limit = poolConfig.connectionLimit;
  
  // Note: MySQL2 doesn't expose active/idle/waiting counts directly
  // We'll return what we can determine from the config
  // For more accurate stats, we'd need to track connections manually
  return {
    active: 0, // Cannot be determined without tracking
    idle: 0, // Cannot be determined without tracking
    waiting: 0, // Cannot be determined without tracking
    total: 0, // Cannot be determined without tracking
    limit: limit ?? 10,
    utilization: 0, // Will be calculated when we test connectivity
  };
}

/**
 * Test database connectivity and measure response time
 */
export async function testDatabaseConnection(): Promise<{
  connected: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    if (!pool) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        error: 'Pool not initialized',
      };
    }

    const connection = await pool.getConnection();
    try {
      await connection.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      return {
        connected: true,
        responseTime,
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    return {
      connected: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export types for use in other modules
export type { Pool, PoolConnection, ResultSetHeader };
