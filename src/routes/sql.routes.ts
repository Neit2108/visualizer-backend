// ==========================================
// SQL Routes
// ==========================================

import { Router } from 'express';
import { SQLController } from '../controllers/sql.controller.js';
import { asyncHandler } from '../middleware/error-handler.js';

export function createSQLRoutes(sqlController: SQLController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/sql/execute:
   *   post:
   *     tags:
   *       - SQL
   *     summary: Execute a single SQL statement
   *     description: |
   *       Executes a single SQL statement against the session's MySQL database.
   *       Supports CREATE TABLE, INSERT, UPDATE, DELETE, and SELECT statements.
   *       For SELECT queries, returns the result set.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ExecuteSQLRequest'
   *           examples:
   *             createTable:
   *               summary: Create a table
   *               value:
   *                 sessionId: "550e8400-e29b-41d4-a716-446655440000"
   *                 sql: "CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE);"
   *             insertData:
   *               summary: Insert data
   *               value:
   *                 sessionId: "550e8400-e29b-41d4-a716-446655440000"
   *                 sql: "INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com');"
   *             selectData:
   *               summary: Select data
   *               value:
   *                 sessionId: "550e8400-e29b-41d4-a716-446655440000"
   *                 sql: "SELECT * FROM users WHERE name LIKE '%John%';"
   *     responses:
   *       200:
   *         description: SQL executed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/ExecuteSQLResponse'
   *       400:
   *         description: Validation error (missing sessionId or sql)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   $ref: '#/components/schemas/ApiError'
   *             example:
   *               success: false
   *               error:
   *                 code: "VALIDATION_ERROR"
   *                 message: "sessionId is required"
   *       404:
   *         description: Session not found
   *       500:
   *         description: SQL execution error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   $ref: '#/components/schemas/ApiError'
   *             example:
   *               success: false
   *               error:
   *                 code: "MYSQL_ERROR_1146"
   *                 message: "Table does not exist: Table 'session_xxx.users' doesn't exist"
   */
  router.post('/execute', asyncHandler(sqlController.executeSQL));

  /**
   * @openapi
   * /api/sql/execute-multiple:
   *   post:
   *     tags:
   *       - SQL
   *     summary: Execute multiple SQL statements
   *     description: |
   *       Executes multiple SQL statements separated by semicolons.
   *       Each statement is executed in order, and results are returned for each.
   *       Useful for batch operations like setting up a schema with sample data.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ExecuteSQLRequest'
   *           example:
   *             sessionId: "550e8400-e29b-41d4-a716-446655440000"
   *             sql: |
   *               CREATE TABLE products (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), price DECIMAL(10,2));
   *               INSERT INTO products (name, price) VALUES ('Widget', 9.99);
   *               INSERT INTO products (name, price) VALUES ('Gadget', 19.99);
   *               SELECT * FROM products;
   *     responses:
   *       200:
   *         description: All SQL statements executed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ExecuteSQLResponse'
   *       400:
   *         description: Validation error
   *       404:
   *         description: Session not found
   *       500:
   *         description: SQL execution error (returns partial results if some statements succeeded)
   */
  router.post('/execute-multiple', asyncHandler(sqlController.executeMultipleSQL));

  /**
   * @openapi
   * /api/sql/tables/{sessionId}:
   *   get:
   *     tags:
   *       - SQL
   *     summary: Get all tables with schemas
   *     description: |
   *       Retrieves all tables in the session's database along with their:
   *       - Column definitions (name, type, constraints)
   *       - Current data (all rows)
   *       - ER diagram showing relationships between tables
   *     parameters:
   *       - name: sessionId
   *         in: path
   *         required: true
   *         description: The session ID to query
   *         schema:
   *           type: string
   *           format: uuid
   *         example: 550e8400-e29b-41d4-a716-446655440000
   *     responses:
   *       200:
   *         description: Tables and schemas retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/GetTablesResponse'
   *       400:
   *         description: Validation error (missing sessionId)
   *       404:
   *         description: Session not found
   */
  router.get('/tables/:sessionId', asyncHandler(sqlController.getTables));

  /**
   * @openapi
   * /api/sql/tables/{sessionId}/{tableName}:
   *   get:
   *     tags:
   *       - SQL
   *     summary: Get data for a specific table
   *     description: Retrieves all data from a specific table in the session's database.
   *     parameters:
   *       - name: sessionId
   *         in: path
   *         required: true
   *         description: The session ID
   *         schema:
   *           type: string
   *           format: uuid
   *         example: 550e8400-e29b-41d4-a716-446655440000
   *       - name: tableName
   *         in: path
   *         required: true
   *         description: The name of the table to retrieve data from
   *         schema:
   *           type: string
   *         example: users
   *     responses:
   *       200:
   *         description: Table data retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/TableData'
   *       400:
   *         description: Validation error (missing sessionId or tableName)
   *       404:
   *         description: Session or table not found
   */
  router.get('/tables/:sessionId/:tableName', asyncHandler(sqlController.getTableData));

  /**
   * @openapi
   * /api/sql/visualize:
   *   post:
   *     tags:
   *       - SQL
   *     summary: Visualize query execution
   *     description: |
   *       Visualizes the execution order and data flow of a SELECT query.
   *       Returns step-by-step breakdown showing:
   *       - The logical execution order (FROM → WHERE → GROUP BY → SELECT → ORDER BY → LIMIT)
   *       - How data flows through each step
   *       - Which rows are included/excluded at each step
   *       - Statistics for each processing step
   *       
   *       **Note:** Only SELECT queries can be visualized.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/VisualizeQueryRequest'
   *           examples:
   *             simpleSelect:
   *               summary: Simple SELECT with WHERE
   *               value:
   *                 sessionId: "550e8400-e29b-41d4-a716-446655440000"
   *                 query: "SELECT * FROM users WHERE age > 18"
   *             complexSelect:
   *               summary: Complex SELECT with JOIN and aggregation
   *               value:
   *                 sessionId: "550e8400-e29b-41d4-a716-446655440000"
   *                 query: "SELECT u.name, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id HAVING order_count > 0 ORDER BY order_count DESC LIMIT 10"
   *     responses:
   *       200:
   *         description: Query visualization generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/VisualizeQueryResponse'
   *       400:
   *         description: Validation error or non-SELECT query
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   $ref: '#/components/schemas/ApiError'
   *             example:
   *               success: false
   *               error:
   *                 code: "VALIDATION_ERROR"
   *                 message: "Only SELECT queries can be visualized"
   *       404:
   *         description: Session not found
   */
  router.post('/visualize', asyncHandler(sqlController.visualizeQuery));

  return router;
}
