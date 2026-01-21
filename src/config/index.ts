// ==========================================
// Configuration Exports
// ==========================================

export {
  getPool,
  initializeDatabase,
  createSessionSchema,
  dropSessionSchema,
  getSessionConnection,
  getSessionSchemaName,
  sessionSchemaExists,
  closePool,
} from './database.js';

export type { Pool, PoolConnection, ResultSetHeader } from './database.js';

export const config = {
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  corsOrigins: process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:5173', 'http://localhost:3000'],
  sessionTimeout: parseInt(process.env['SESSION_TIMEOUT'] ?? '3600000', 10), // 1 hour default
  mysql: {
    host: process.env['MYSQL_HOST'] ?? 'localhost',
    port: parseInt(process.env['MYSQL_PORT'] ?? '3306', 10),
    user: process.env['MYSQL_USER'] ?? 'root',
    password: process.env['MYSQL_PASSWORD'] ?? '',
    database: process.env['MYSQL_DATABASE'] ?? 'sql_visualization',
    poolSize: parseInt(process.env['MYSQL_POOL_SIZE'] ?? '10', 10),
  },
};
