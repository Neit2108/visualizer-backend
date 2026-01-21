// ==========================================
// SQL Visualization Backend
// Main Application Entry Point
// ==========================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config, initializeDatabase, closePool } from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import { createAPIRouter } from './routes/index.js';
import { SessionService } from './services/session.service.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/index.js';

// Create Express app
const app = express();

// Initialize services
const sessionService = new SessionService(config.sessionTimeout);

// Security and parsing middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SQL Visualization API Docs',
}));

// Serve raw OpenAPI spec as JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api', createAPIRouter(sessionService));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'SQL Visualization Backend',
      version: '1.0.0',
      database: 'MySQL',
      endpoints: {
        health: 'GET /api/health',
        sessions: {
          create: 'POST /api/sessions',
          get: 'GET /api/sessions/:sessionId',
          delete: 'DELETE /api/sessions/:sessionId',
          list: 'GET /api/sessions',
        },
        sql: {
          execute: 'POST /api/sql/execute',
          executeMultiple: 'POST /api/sql/execute-multiple',
          getTables: 'GET /api/sql/tables/:sessionId',
          getTableData: 'GET /api/sql/tables/:sessionId/:tableName',
          visualize: 'POST /api/sql/visualize',
        },
        feedback: {
          submit: 'POST /api/feedback',
          getAll: 'GET /api/feedback',
          getStats: 'GET /api/feedback/stats',
          getById: 'GET /api/feedback/:id',
          getBySessionId: 'GET /api/feedback/session/:sessionId',
          getByEmail: 'GET /api/feedback/email/:email',
          update: 'PUT /api/feedback/:id',
          delete: 'DELETE /api/feedback/:id',
        },
      },
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  console.log('\nShutting down gracefully...');
  await sessionService.destroy();
  await closePool();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

// Initialize database and start server
async function startServer(): Promise<void> {
  try {
    // Initialize MySQL connection pool
    console.log('Initializing MySQL connection...');
    await initializeDatabase();
    
    // Start server
    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║           SQL Visualization Backend Started                ║
║                     (MySQL Edition)                        ║
╠════════════════════════════════════════════════════════════╣
║  Server:     http://localhost:${config.port.toString().padEnd(5)}                     ║
║  Environment: ${config.nodeEnv.padEnd(12)}                          ║
║  MySQL:      ${config.mysql.host}:${config.mysql.port}                         ║
║  Database:   ${config.mysql.database.padEnd(20)}                 ║
╚════════════════════════════════════════════════════════════╝

📚 API Documentation:
  Swagger UI:   http://localhost:${config.port}/api-docs
  OpenAPI JSON: http://localhost:${config.port}/api-docs.json

API Endpoints:
  Sessions:
    POST   /api/sessions              - Create new session
    GET    /api/sessions              - List all sessions
    GET    /api/sessions/:id          - Get session info
    DELETE /api/sessions/:id          - Delete session
  
  SQL:
    POST   /api/sql/execute           - Execute SQL statement
    POST   /api/sql/execute-multiple  - Execute multiple statements
    GET    /api/sql/tables/:sessionId - Get all tables with data
    POST   /api/sql/visualize         - Visualize query execution

  Feedback:
    POST   /api/feedback              - Submit feedback
    GET    /api/feedback              - Get all feedback (paginated)
    GET    /api/feedback/stats        - Get feedback statistics
    GET    /api/feedback/:id          - Get feedback by ID
    GET    /api/feedback/session/:sid - Get feedback by session
    GET    /api/feedback/email/:email - Get feedback by email
    PUT    /api/feedback/:id          - Update feedback
    DELETE /api/feedback/:id          - Delete feedback

Ready to accept connections...
`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();

export default app;
