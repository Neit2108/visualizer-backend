# SQL Visualization API Documentation

This folder contains comprehensive documentation for frontend integration.

## 📚 Documentation Files

| File | Description |
|------|-------------|
| [FRONTEND_API_GUIDE.md](./FRONTEND_API_GUIDE.md) | Complete API guide with examples, workflows, and error handling |
| [frontend-types.ts](./frontend-types.ts) | TypeScript types to copy into frontend project |
| [frontend-api-client.ts](./frontend-api-client.ts) | Ready-to-use API client with all methods |

## 🚀 Quick Start for Frontend Developers

### 1. Copy Types and API Client

Copy these files into your frontend project:

```bash
# From frontend project root
cp ../backend/docs/frontend-types.ts src/api/types.ts
cp ../backend/docs/frontend-api-client.ts src/api/sqlVisualizationApi.ts
```

### 2. Install Dependencies (if using the API client)

The API client uses only native `fetch`, so no additional dependencies are required.

### 3. Start Using the API

```typescript
import { api, initSession } from './api/sqlVisualizationApi';

// Initialize session (handles storage automatically)
const sessionId = await initSession();

// Execute SQL
await api.executeSQL(sessionId, 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');

// Get tables
const { tables, erDiagram } = await api.getTables(sessionId);

// Visualize query
const { visualization } = await api.visualizeQuery(sessionId, 'SELECT * FROM users WHERE id > 0');
```

## 🔗 Interactive Documentation

The backend provides interactive Swagger documentation:

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json

## 📖 API Overview

| Category | Endpoints |
|----------|-----------|
| **Sessions** | Create, Get, Delete, List sessions |
| **SQL Execution** | Execute single/multiple SQL statements |
| **Tables** | Get schemas, data, ER diagrams |
| **Visualization** | Visualize SELECT query execution flow |

## 🎯 Key Concepts

### Sessions
Each user gets an isolated in-memory SQLite database. Sessions expire after 1 hour of inactivity.

### ER Diagrams
Automatically generated when 2+ tables exist, showing foreign key relationships.

### Query Visualization
Shows the logical SQL execution order:
1. FROM → Load data
2. WHERE → Filter rows
3. GROUP BY → Group rows
4. HAVING → Filter groups
5. SELECT → Choose columns
6. DISTINCT → Remove duplicates
7. ORDER BY → Sort results
8. LIMIT/OFFSET → Paginate

Each step includes:
- The rows at that stage
- Which rows are included/excluded
- Why rows were filtered out
- Statistics (total, included, excluded counts)
