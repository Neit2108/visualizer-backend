// ==========================================
// Error Handler Middleware
// ==========================================

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err.message);

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(process.env['NODE_ENV'] === 'development' && {
          details: err.stack,
        }),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle MySQL errors
  if (isMySQLError(err)) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: `MYSQL_ERROR_${(err as MySQLError).errno ?? 'UNKNOWN'}`,
        message: getMySQLErrorMessage(err as MySQLError),
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle legacy SQLite errors (in case any remain)
  if (err.message?.includes('SQLITE')) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'SQL_ERROR',
        message: err.message,
      },
    };
    res.status(400).json(response);
    return;
  }

  // Log unexpected errors
  console.error('Unexpected error:', err.stack);

  // Don't leak error details in production
  const message =
    process.env['NODE_ENV'] === 'production'
      ? 'Internal server error'
      : err.message;

  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  };
  res.status(500).json(response);
};

// MySQL Error interface
interface MySQLError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  sql?: string;
}

// Check if error is a MySQL error
function isMySQLError(err: Error): boolean {
  const mysqlErr = err as MySQLError;
  return (
    mysqlErr.code !== undefined &&
    (mysqlErr.errno !== undefined || mysqlErr.sqlState !== undefined)
  );
}

// Get user-friendly MySQL error message
function getMySQLErrorMessage(err: MySQLError): string {
  const errorMessages: Record<string, string> = {
    ER_NO_SUCH_TABLE: `Table does not exist: ${err.sqlMessage ?? err.message}`,
    ER_DUP_ENTRY: `Duplicate entry: ${err.sqlMessage ?? err.message}`,
    ER_BAD_FIELD_ERROR: `Unknown column: ${err.sqlMessage ?? err.message}`,
    ER_PARSE_ERROR: `SQL syntax error: ${err.sqlMessage ?? err.message}`,
    ER_TABLE_EXISTS_ERROR: `Table already exists: ${err.sqlMessage ?? err.message}`,
    ER_ACCESS_DENIED_ERROR: 'Database access denied',
    ER_DBACCESS_DENIED_ERROR: 'Database access denied',
    ER_BAD_DB_ERROR: `Unknown database: ${err.sqlMessage ?? err.message}`,
    ER_NO_REFERENCED_ROW: `Foreign key constraint failed: ${err.sqlMessage ?? err.message}`,
    ER_NO_REFERENCED_ROW_2: `Foreign key constraint failed: ${err.sqlMessage ?? err.message}`,
    ER_ROW_IS_REFERENCED: `Cannot delete - row is referenced by a foreign key: ${err.sqlMessage ?? err.message}`,
    ER_ROW_IS_REFERENCED_2: `Cannot delete - row is referenced by a foreign key: ${err.sqlMessage ?? err.message}`,
    ER_DATA_TOO_LONG: `Data too long for column: ${err.sqlMessage ?? err.message}`,
    ER_TRUNCATED_WRONG_VALUE: `Incorrect value: ${err.sqlMessage ?? err.message}`,
    ECONNREFUSED: 'Cannot connect to MySQL server. Please ensure MySQL is running.',
    PROTOCOL_CONNECTION_LOST: 'MySQL connection was lost. Please try again.',
    ER_CON_COUNT_ERROR: 'Too many database connections. Please try again later.',
  };

  return (
    (err.code && errorMessages[err.code]) ??
    err.sqlMessage ??
    err.message ??
    'Unknown MySQL error'
  );
}

// Async error wrapper for controllers
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
    },
  };
  res.status(404).json(response);
};
