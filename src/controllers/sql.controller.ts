// ==========================================
// SQL Controller
// HTTP handlers for SQL execution and visualization
// ==========================================

import type { Request, Response } from 'express';
import type {
  ApiResponse,
  ExecuteSQLRequest,
  ExecuteSQLResponse,
  GetTablesResponse,
  VisualizeQueryRequest,
  VisualizeQueryResponse,
  TableData,
} from '../types/index.js';
import { SessionService } from '../services/session.service.js';
import { SQLExecutionService } from '../services/sql-execution.service.js';
import { ValidationError } from '../utils/errors.js';

export class SQLController {
  private sqlExecutionService: SQLExecutionService;

  constructor(private sessionService: SessionService) {
    this.sqlExecutionService = new SQLExecutionService();
  }

  /**
   * POST /api/sql/execute
   * Execute SQL statement(s)
   */
  executeSQL = async (req: Request, res: Response): Promise<void> => {
    const { sessionId, sql } = req.body as ExecuteSQLRequest;

    if (!sessionId) {
      throw new ValidationError('sessionId is required');
    }
    if (!sql) {
      throw new ValidationError('sql is required');
    }

    const connection = await this.sessionService.getConnection(sessionId);
    const schemaName = this.sessionService.getSchemaName(sessionId);
    
    try {
      const result = await this.sqlExecutionService.executeSQL(connection, schemaName, sql);

      const response: ApiResponse<ExecuteSQLResponse> = {
        success: true,
        data: result,
      };

      res.json(response);
    } finally {
      connection.release();
    }
  };

  /**
   * POST /api/sql/execute-multiple
   * Execute multiple SQL statements
   */
  executeMultipleSQL = async (req: Request, res: Response): Promise<void> => {
    const { sessionId, sql } = req.body as ExecuteSQLRequest;

    if (!sessionId) {
      throw new ValidationError('sessionId is required');
    }
    if (!sql) {
      throw new ValidationError('sql is required');
    }

    const connection = await this.sessionService.getConnection(sessionId);
    const schemaName = this.sessionService.getSchemaName(sessionId);
    
    try {
      const results = await this.sqlExecutionService.executeMultipleSQL(connection, schemaName, sql);

      const response: ApiResponse<ExecuteSQLResponse[]> = {
        success: true,
        data: results,
      };

      res.json(response);
    } finally {
      connection.release();
    }
  };

  /**
   * GET /api/sql/tables/:sessionId
   * Get all tables with schemas and data
   */
  getTables = async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.params['sessionId'] ?? '');

    if (!sessionId) {
      throw new ValidationError('sessionId is required');
    }

    const connection = await this.sessionService.getConnection(sessionId);
    const schemaName = this.sessionService.getSchemaName(sessionId);
    
    try {
      const result = await this.sqlExecutionService.getTables(connection, schemaName);

      const response: ApiResponse<GetTablesResponse> = {
        success: true,
        data: result,
      };

      res.json(response);
    } finally {
      connection.release();
    }
  };

  /**
   * GET /api/sql/tables/:sessionId/:tableName
   * Get data for a specific table
   */
  getTableData = async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.params['sessionId'] ?? '');
    const tableName = String(req.params['tableName'] ?? '');

    if (!sessionId) {
      throw new ValidationError('sessionId is required');
    }
    if (!tableName) {
      throw new ValidationError('tableName is required');
    }

    const connection = await this.sessionService.getConnection(sessionId);
    const schemaName = this.sessionService.getSchemaName(sessionId);
    
    try {
      const result = await this.sqlExecutionService.getTableData(connection, schemaName, tableName);

      const response: ApiResponse<TableData> = {
        success: true,
        data: result,
      };

      res.json(response);
    } finally {
      connection.release();
    }
  };

  /**
   * POST /api/sql/visualize
   * Visualize query execution order and data flow
   */
  visualizeQuery = async (req: Request, res: Response): Promise<void> => {
    const { sessionId, query } = req.body as VisualizeQueryRequest;

    if (!sessionId) {
      throw new ValidationError('sessionId is required');
    }
    if (!query) {
      throw new ValidationError('query is required');
    }

    const connection = await this.sessionService.getConnection(sessionId);
    const schemaName = this.sessionService.getSchemaName(sessionId);
    
    try {
      const visualization = await this.sqlExecutionService.visualizeQuery(connection, schemaName, query);

      const response: ApiResponse<VisualizeQueryResponse> = {
        success: true,
        data: { visualization },
      };

      res.json(response);
    } finally {
      connection.release();
    }
  };
}
