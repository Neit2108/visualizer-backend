// ==========================================
// Database Configuration - MySQL
// ==========================================

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';

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

// Export types for use in other modules
export type { Pool, PoolConnection, ResultSetHeader };
