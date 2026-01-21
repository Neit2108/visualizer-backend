// ==========================================
// Swagger/OpenAPI Configuration
// ==========================================

import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index.js';

const swaggerDefinition: swaggerJsdoc.SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SQL Visualization API',
    version: '1.0.0',
    description: `
API for SQL Visualization Backend - Execute SQL queries, manage sessions, and visualize query execution flow.

## Features
- **Session Management**: Create isolated database sessions for each user
- **SQL Execution**: Execute single or multiple SQL statements
- **Query Visualization**: Visualize the execution order and data flow of SELECT queries
- **Table Inspection**: View table schemas, relationships, and data

## Authentication
Currently, this API uses session-based identification. Create a session first, then use the sessionId in subsequent requests.
    `,
    contact: {
      name: 'API Support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'Sessions',
      description: 'Session management endpoints',
    },
    {
      name: 'SQL',
      description: 'SQL execution and visualization endpoints',
    },
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
  ],
  components: {
    schemas: {
      // Base API Response
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful',
          },
          data: {
            type: 'object',
            description: 'Response data (varies by endpoint)',
          },
          error: {
            $ref: '#/components/schemas/ApiError',
          },
        },
        required: ['success'],
      },
      ApiError: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Error code',
            example: 'VALIDATION_ERROR',
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
            example: 'sessionId is required',
          },
          details: {
            type: 'object',
            description: 'Additional error details',
          },
        },
        required: ['code', 'message'],
      },

      // Session Types
      Session: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique session identifier',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Session creation timestamp',
          },
          lastAccessedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last access timestamp',
          },
        },
        required: ['id', 'createdAt', 'lastAccessedAt'],
      },
      CreateSessionResponse: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            format: 'uuid',
            description: 'The newly created session ID',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
        required: ['sessionId'],
      },

      // SQL Types
      ExecuteSQLRequest: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            format: 'uuid',
            description: 'Session ID to execute SQL against',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          sql: {
            type: 'string',
            description: 'SQL statement(s) to execute',
            example: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL);',
          },
        },
        required: ['sessionId', 'sql'],
      },
      ExecuteSQLResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          message: {
            type: 'string',
            description: 'Execution result message',
            example: 'Table created successfully',
          },
          affectedTables: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of tables affected by the operation',
            example: ['users'],
          },
          data: {
            $ref: '#/components/schemas/TableData',
          },
        },
        required: ['success', 'message'],
      },
      TableData: {
        type: 'object',
        properties: {
          tableName: {
            type: 'string',
            description: 'Name of the table',
            example: 'users',
          },
          columns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Column names',
            example: ['id', 'name', 'email'],
          },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
            description: 'Row data',
            example: [{ id: 1, name: 'John', email: 'john@example.com' }],
          },
        },
        required: ['tableName', 'columns', 'rows'],
      },
      ColumnDefinition: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'id' },
          type: { type: 'string', example: 'INTEGER' },
          isPrimaryKey: { type: 'boolean' },
          isForeignKey: { type: 'boolean' },
          isNotNull: { type: 'boolean' },
          isUnique: { type: 'boolean' },
          defaultValue: { type: 'string' },
          references: {
            type: 'object',
            properties: {
              table: { type: 'string' },
              column: { type: 'string' },
            },
          },
        },
        required: ['name', 'type', 'isPrimaryKey', 'isForeignKey', 'isNotNull', 'isUnique'],
      },
      TableSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'users' },
          columns: {
            type: 'array',
            items: { $ref: '#/components/schemas/ColumnDefinition' },
          },
        },
        required: ['name', 'columns'],
      },
      ERRelationship: {
        type: 'object',
        properties: {
          fromTable: { type: 'string' },
          fromColumn: { type: 'string' },
          toTable: { type: 'string' },
          toColumn: { type: 'string' },
          type: {
            type: 'string',
            enum: ['one-to-one', 'one-to-many', 'many-to-many'],
          },
        },
        required: ['fromTable', 'fromColumn', 'toTable', 'toColumn', 'type'],
      },
      ERDiagram: {
        type: 'object',
        properties: {
          tables: {
            type: 'array',
            items: { $ref: '#/components/schemas/TableSchema' },
          },
          relationships: {
            type: 'array',
            items: { $ref: '#/components/schemas/ERRelationship' },
          },
        },
        required: ['tables', 'relationships'],
      },
      GetTablesResponse: {
        type: 'object',
        properties: {
          tables: {
            type: 'array',
            items: { $ref: '#/components/schemas/TableSchema' },
          },
          tableData: {
            type: 'array',
            items: { $ref: '#/components/schemas/TableData' },
          },
          erDiagram: { $ref: '#/components/schemas/ERDiagram' },
        },
        required: ['tables', 'tableData'],
      },

      // Visualization Types
      VisualizeQueryRequest: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            format: 'uuid',
            description: 'Session ID',
          },
          query: {
            type: 'string',
            description: 'SELECT query to visualize',
            example: 'SELECT * FROM users WHERE age > 18 ORDER BY name',
          },
        },
        required: ['sessionId', 'query'],
      },
      ExecutionStep: {
        type: 'object',
        properties: {
          order: { type: 'integer', example: 1 },
          type: {
            type: 'string',
            enum: ['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT', 'OFFSET'],
          },
          clause: { type: 'string', example: 'FROM users' },
          description: { type: 'string', example: 'Load data from users table' },
        },
        required: ['order', 'type', 'clause', 'description'],
      },
      DataFlowStep: {
        type: 'object',
        properties: {
          stepOrder: { type: 'integer' },
          stepType: { type: 'string' },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                data: { type: 'object' },
                included: { type: 'boolean' },
                excludedReason: { type: 'string' },
              },
            },
          },
          columns: {
            type: 'array',
            items: { type: 'string' },
          },
          description: { type: 'string' },
          stats: {
            type: 'object',
            properties: {
              totalRows: { type: 'integer' },
              includedRows: { type: 'integer' },
              excludedRows: { type: 'integer' },
            },
          },
        },
      },
      QueryVisualization: {
        type: 'object',
        properties: {
          originalQuery: { type: 'string' },
          executionSteps: {
            type: 'array',
            items: { $ref: '#/components/schemas/ExecutionStep' },
          },
          dataFlow: {
            type: 'array',
            items: { $ref: '#/components/schemas/DataFlowStep' },
          },
          finalResult: { $ref: '#/components/schemas/TableData' },
        },
        required: ['originalQuery', 'executionSteps', 'dataFlow', 'finalResult'],
      },
      VisualizeQueryResponse: {
        type: 'object',
        properties: {
          visualization: { $ref: '#/components/schemas/QueryVisualization' },
        },
        required: ['visualization'],
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './dist/routes/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
