# SQL Visualization API - Frontend Integration Guide

> **Base URL**: `http://localhost:3000`  
> **Swagger UI**: `http://localhost:3000/api-docs`  
> **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Overview](#api-overview)
3. [TypeScript Types](#typescript-types)
4. [API Endpoints](#api-endpoints)
   - [Sessions](#sessions)
   - [SQL Execution](#sql-execution)
   - [Query Visualization](#query-visualization)
5. [Error Handling](#error-handling)
6. [Common Workflows](#common-workflows)
7. [Example API Client](#example-api-client)

---

## Quick Start

```typescript
// 1. Create a session (on app load)
const { sessionId } = await api.createSession();

// 2. Execute SQL to set up tables
await api.executeSQL(sessionId, `
  CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER);
  INSERT INTO users VALUES (1, 'Alice', 30), (2, 'Bob', 20), (3, 'Charlie', 25);
`);

// 3. Get tables and ER diagram
const { tables, tableData, erDiagram } = await api.getTables(sessionId);

// 4. Visualize a query
const { visualization } = await api.visualizeQuery(sessionId, 'SELECT * FROM users WHERE age > 21');
```

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | POST | Create new session |
| `/api/sessions` | GET | List all sessions |
| `/api/sessions/:sessionId` | GET | Get session info |
| `/api/sessions/:sessionId` | DELETE | Delete session |
| `/api/sql/execute` | POST | Execute SQL statement |
| `/api/sql/execute-multiple` | POST | Execute multiple SQL statements |
| `/api/sql/tables/:sessionId` | GET | Get all tables with data |
| `/api/sql/tables/:sessionId/:tableName` | GET | Get specific table data |
| `/api/sql/visualize` | POST | Visualize SELECT query execution |
| `/api/health` | GET | Health check |

---

## TypeScript Types

Copy these types directly into your frontend project:

```typescript
// ============================================
// api/types.ts - Copy this file to your frontend
// ============================================

// ==================== Base Types ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// ==================== Session Types ====================

export interface Session {
  id: string;
  createdAt: string;  // ISO date string
  lastAccessedAt: string;  // ISO date string
}

export interface CreateSessionResponse {
  sessionId: string;
}

export interface SessionStatsResponse {
  activeSessionCount: number;
  sessions: Session[];
}

// ==================== Table Types ====================

export interface ColumnDefinition {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    column: string;
  };
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

// ==================== ER Diagram Types ====================

export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-many';

export interface ERRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: RelationshipType;
}

export interface ERDiagram {
  tables: TableSchema[];
  relationships: ERRelationship[];
}

export interface GetTablesResponse {
  tables: TableSchema[];
  tableData: TableData[];
  erDiagram?: ERDiagram;  // Only present when 2+ tables exist
}

// ==================== SQL Execution Types ====================

export interface ExecuteSQLRequest {
  sessionId: string;
  sql: string;
}

export interface ExecuteSQLResponse {
  success: boolean;
  message: string;
  affectedTables?: string[];
  data?: TableData;  // Present for SELECT queries
}

// ==================== Visualization Types ====================

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

export interface RowState {
  data: Record<string, unknown>;
  included: boolean;
  excludedReason?: string;  // Why this row was filtered out
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

export interface VisualizeQueryRequest {
  sessionId: string;
  query: string;
}

export interface VisualizeQueryResponse {
  visualization: QueryVisualization;
}
```

---

## API Endpoints

### Sessions

#### Create Session

Creates a new isolated SQLite database session.

```http
POST /api/sessions
Content-Type: application/json
```

**Response** `201 Created`
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Frontend Usage:**
```typescript
const response = await fetch('/api/sessions', { method: 'POST' });
const { data } = await response.json();
const sessionId = data.sessionId;
// Store sessionId in state/localStorage
```

---

#### Get Session Info

```http
GET /api/sessions/:sessionId
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "lastAccessedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

---

#### Delete Session

```http
DELETE /api/sessions/:sessionId
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

### SQL Execution

#### Execute Single SQL Statement

```http
POST /api/sql/execute
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "sql": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, age INTEGER)"
}
```

**Response for DDL (CREATE/ALTER/DROP):** `200 OK`
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Table 'users' created successfully",
    "affectedTables": ["users"]
  }
}
```

**Response for DML (INSERT/UPDATE/DELETE):** `200 OK`
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "INSERT executed successfully. 3 rows affected.",
    "affectedTables": ["users"]
  }
}
```

**Response for SELECT:** `200 OK`
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Query returned 3 rows",
    "data": {
      "tableName": "Query Result",
      "columns": ["id", "name", "age"],
      "rows": [
        { "id": 1, "name": "Alice", "age": 30 },
        { "id": 2, "name": "Bob", "age": 20 },
        { "id": 3, "name": "Charlie", "age": 25 }
      ]
    }
  }
}
```

---

#### Execute Multiple SQL Statements

Executes multiple semicolon-separated statements in sequence.

```http
POST /api/sql/execute-multiple
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "sql": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);\nINSERT INTO users VALUES (1, 'Alice');\nINSERT INTO users VALUES (2, 'Bob');\nSELECT * FROM users;"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    { "success": true, "message": "Table 'users' created successfully", "affectedTables": ["users"] },
    { "success": true, "message": "INSERT executed successfully. 1 rows affected.", "affectedTables": ["users"] },
    { "success": true, "message": "INSERT executed successfully. 1 rows affected.", "affectedTables": ["users"] },
    { "success": true, "message": "Query returned 2 rows", "data": { "tableName": "Query Result", "columns": ["id", "name"], "rows": [...] } }
  ]
}
```

---

#### Get All Tables

Returns all tables with their schemas, data, and ER diagram (if 2+ tables).

```http
GET /api/sql/tables/:sessionId
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tables": [
      {
        "name": "users",
        "columns": [
          { "name": "id", "type": "INTEGER", "isPrimaryKey": true, "isForeignKey": false, "isNotNull": false, "isUnique": true },
          { "name": "name", "type": "TEXT", "isPrimaryKey": false, "isForeignKey": false, "isNotNull": true, "isUnique": false },
          { "name": "age", "type": "INTEGER", "isPrimaryKey": false, "isForeignKey": false, "isNotNull": false, "isUnique": false }
        ]
      },
      {
        "name": "orders",
        "columns": [
          { "name": "id", "type": "INTEGER", "isPrimaryKey": true, "isForeignKey": false, "isNotNull": false, "isUnique": true },
          { "name": "user_id", "type": "INTEGER", "isPrimaryKey": false, "isForeignKey": true, "isNotNull": false, "isUnique": false, "references": { "table": "users", "column": "id" } },
          { "name": "total", "type": "REAL", "isPrimaryKey": false, "isForeignKey": false, "isNotNull": false, "isUnique": false }
        ]
      }
    ],
    "tableData": [
      {
        "tableName": "users",
        "columns": ["id", "name", "age"],
        "rows": [
          { "id": 1, "name": "Alice", "age": 30 },
          { "id": 2, "name": "Bob", "age": 20 }
        ]
      },
      {
        "tableName": "orders",
        "columns": ["id", "user_id", "total"],
        "rows": [
          { "id": 1, "user_id": 1, "total": 99.99 }
        ]
      }
    ],
    "erDiagram": {
      "tables": [...],
      "relationships": [
        {
          "fromTable": "orders",
          "fromColumn": "user_id",
          "toTable": "users",
          "toColumn": "id",
          "type": "one-to-many"
        }
      ]
    }
  }
}
```

> **Note:** `erDiagram` is only present when there are 2 or more tables.

---

### Query Visualization

#### Visualize SELECT Query

Returns the execution order and data flow for a SELECT query.

```http
POST /api/sql/visualize
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "query": "SELECT * FROM users WHERE age > 21 ORDER BY name"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "visualization": {
      "originalQuery": "SELECT * FROM users WHERE age > 21 ORDER BY name",
      "executionSteps": [
        { "order": 1, "type": "FROM", "clause": "FROM users", "description": "Load data from table(s)" },
        { "order": 2, "type": "WHERE", "clause": "WHERE age > 21", "description": "Filter rows based on conditions" },
        { "order": 3, "type": "SELECT", "clause": "SELECT *", "description": "Select specified columns" },
        { "order": 4, "type": "ORDER BY", "clause": "ORDER BY name", "description": "Sort result rows" }
      ],
      "dataFlow": [
        {
          "stepOrder": 1,
          "stepType": "FROM",
          "rows": [
            { "data": { "id": 1, "name": "Alice", "age": 30 }, "included": true },
            { "data": { "id": 2, "name": "Bob", "age": 20 }, "included": true },
            { "data": { "id": 3, "name": "Charlie", "age": 25 }, "included": true }
          ],
          "columns": ["id", "name", "age"],
          "description": "Load data from table(s)",
          "stats": { "totalRows": 3, "includedRows": 3, "excludedRows": 0 }
        },
        {
          "stepOrder": 2,
          "stepType": "WHERE",
          "rows": [
            { "data": { "id": 1, "name": "Alice", "age": 30 }, "included": true },
            { "data": { "id": 2, "name": "Bob", "age": 20 }, "included": false, "excludedReason": "Does not match: age > 21" },
            { "data": { "id": 3, "name": "Charlie", "age": 25 }, "included": true }
          ],
          "columns": ["id", "name", "age"],
          "description": "Filter rows based on conditions",
          "stats": { "totalRows": 3, "includedRows": 2, "excludedRows": 1 }
        },
        {
          "stepOrder": 3,
          "stepType": "SELECT",
          "rows": [
            { "data": { "id": 1, "name": "Alice", "age": 30 }, "included": true },
            { "data": { "id": 2, "name": "Bob", "age": 20 }, "included": false, "excludedReason": "Does not match: age > 21" },
            { "data": { "id": 3, "name": "Charlie", "age": 25 }, "included": true }
          ],
          "columns": ["id", "name", "age"],
          "description": "Select specified columns",
          "stats": { "totalRows": 3, "includedRows": 2, "excludedRows": 1 }
        },
        {
          "stepOrder": 4,
          "stepType": "ORDER BY",
          "rows": [
            { "data": { "id": 1, "name": "Alice", "age": 30 }, "included": true },
            { "data": { "id": 3, "name": "Charlie", "age": 25 }, "included": true },
            { "data": { "id": 2, "name": "Bob", "age": 20 }, "included": false, "excludedReason": "Does not match: age > 21" }
          ],
          "columns": ["id", "name", "age"],
          "description": "Sort result rows",
          "stats": { "totalRows": 3, "includedRows": 2, "excludedRows": 1 }
        }
      ],
      "finalResult": {
        "tableName": "Query Result",
        "columns": ["id", "name", "age"],
        "rows": [
          { "id": 1, "name": "Alice", "age": 30 },
          { "id": 3, "name": "Charlie", "age": 25 }
        ]
      }
    }
  }
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Missing or invalid request parameters |
| `SQL_EXECUTION_ERROR` | 400 | SQL syntax error or execution failure |
| `SQL_PARSE_ERROR` | 400 | Could not parse the SQL query |
| `SESSION_NOT_FOUND` | 404 | Session ID doesn't exist or expired |
| `NOT_FOUND` | 404 | Resource or route not found |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Frontend Error Handling Example

```typescript
async function executeSQL(sessionId: string, sql: string) {
  try {
    const response = await fetch('/api/sql/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, sql }),
    });

    const result: ApiResponse<ExecuteSQLResponse> = await response.json();

    if (!result.success) {
      // Handle API error
      switch (result.error?.code) {
        case 'SESSION_NOT_FOUND':
          // Session expired, create new one
          await createNewSession();
          break;
        case 'SQL_EXECUTION_ERROR':
          // Show SQL error to user
          showError(`SQL Error: ${result.error.message}`);
          break;
        default:
          showError(result.error?.message || 'Unknown error');
      }
      return null;
    }

    return result.data;
  } catch (error) {
    // Network error
    showError('Network error. Please check your connection.');
    return null;
  }
}
```

---

## Common Workflows

### Workflow 1: Initial Setup

```typescript
// 1. Create session on app load
const session = await createSession();
localStorage.setItem('sessionId', session.sessionId);

// 2. Check if returning user has valid session
const storedSessionId = localStorage.getItem('sessionId');
if (storedSessionId) {
  try {
    await getSession(storedSessionId);
    // Session valid, use it
  } catch {
    // Session expired, create new one
    const newSession = await createSession();
    localStorage.setItem('sessionId', newSession.sessionId);
  }
}
```

### Workflow 2: User Creates Tables and Adds Data

```typescript
// User types SQL and clicks "Run"
const sql = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  );

  INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob', 'bob@example.com');
`;

// Execute and show results
const results = await executeMultipleSQL(sessionId, sql);

// Refresh table list
const { tables, tableData, erDiagram } = await getTables(sessionId);

// Update UI
setTables(tables);
setTableData(tableData);
if (erDiagram) {
  setERDiagram(erDiagram);
}
```

### Workflow 3: Visualize Query Execution

```typescript
// User enters a SELECT query
const query = 'SELECT * FROM users WHERE age > 25 ORDER BY name';

// Get visualization
const { visualization } = await visualizeQuery(sessionId, query);

// Extract for UI components
const { executionSteps, dataFlow, finalResult } = visualization;

// Update state
setExecutionSteps(executionSteps);  // For the stepper component
setDataFlow(dataFlow);              // For the data flow table
setCurrentStepIndex(0);             // Start at first step
setFinalResult(finalResult);        // For showing final output
```

### Workflow 4: Stepping Through Execution

```typescript
// State
const [currentStepIndex, setCurrentStepIndex] = useState(0);
const [dataFlow, setDataFlow] = useState<DataFlowStep[]>([]);

// Get current step data
const currentStep = dataFlow[currentStepIndex];

// Navigation handlers
const goToNextStep = () => {
  if (currentStepIndex < dataFlow.length - 1) {
    setCurrentStepIndex(prev => prev + 1);
  }
};

const goToPrevStep = () => {
  if (currentStepIndex > 0) {
    setCurrentStepIndex(prev => prev - 1);
  }
};

const goToStep = (index: number) => {
  setCurrentStepIndex(index);
};

// Render current step
return (
  <div>
    <ExecutionStepper
      steps={executionSteps}
      currentIndex={currentStepIndex}
      onStepClick={goToStep}
    />
    <DataFlowTable
      rows={currentStep.rows}
      columns={currentStep.columns}
      stats={currentStep.stats}
    />
    <div>
      <button onClick={goToPrevStep} disabled={currentStepIndex === 0}>
        Previous
      </button>
      <button onClick={goToNextStep} disabled={currentStepIndex === dataFlow.length - 1}>
        Next
      </button>
    </div>
  </div>
);
```

---

## Example API Client

Here's a complete API client you can use in your frontend:

```typescript
// api/sqlVisualization.ts

const BASE_URL = 'http://localhost:3000';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data.data;
}

export const api = {
  // Sessions
  createSession: () =>
    request<CreateSessionResponse>('/api/sessions', { method: 'POST' }),

  getSession: (sessionId: string) =>
    request<Session>(`/api/sessions/${sessionId}`),

  deleteSession: (sessionId: string) =>
    request<{ deleted: boolean }>(`/api/sessions/${sessionId}`, { method: 'DELETE' }),

  listSessions: () =>
    request<SessionStatsResponse>('/api/sessions'),

  // SQL Execution
  executeSQL: (sessionId: string, sql: string) =>
    request<ExecuteSQLResponse>('/api/sql/execute', {
      method: 'POST',
      body: JSON.stringify({ sessionId, sql }),
    }),

  executeMultipleSQL: (sessionId: string, sql: string) =>
    request<ExecuteSQLResponse[]>('/api/sql/execute-multiple', {
      method: 'POST',
      body: JSON.stringify({ sessionId, sql }),
    }),

  // Tables
  getTables: (sessionId: string) =>
    request<GetTablesResponse>(`/api/sql/tables/${sessionId}`),

  getTableData: (sessionId: string, tableName: string) =>
    request<TableData>(`/api/sql/tables/${sessionId}/${tableName}`),

  // Visualization
  visualizeQuery: (sessionId: string, query: string) =>
    request<VisualizeQueryResponse>('/api/sql/visualize', {
      method: 'POST',
      body: JSON.stringify({ sessionId, query }),
    }),

  // Health
  healthCheck: () =>
    request<{ status: string; timestamp: string }>('/api/health'),
};
```

---

## React Query Integration (Recommended)

```typescript
// hooks/useSQLVisualization.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/sqlVisualization';

export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  });
}

export function useTables(sessionId: string | null) {
  return useQuery({
    queryKey: ['tables', sessionId],
    queryFn: () => api.getTables(sessionId!),
    enabled: !!sessionId,
  });
}

export function useExecuteSQL(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sql: string) => api.executeSQL(sessionId, sql),
    onSuccess: () => {
      // Invalidate tables query to refresh data
      queryClient.invalidateQueries({ queryKey: ['tables', sessionId] });
    },
  });
}

export function useVisualizeQuery(sessionId: string) {
  return useMutation({
    mutationFn: (query: string) => api.visualizeQuery(sessionId, query),
  });
}
```

---

## Need Help?

- **Swagger UI**: Visit `http://localhost:3000/api-docs` for interactive documentation
- **OpenAPI Spec**: Download from `http://localhost:3000/api-docs.json` for code generation
