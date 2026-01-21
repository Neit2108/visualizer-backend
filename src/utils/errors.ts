// ==========================================
// Custom Error Classes
// ==========================================

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class SQLExecutionError extends AppError {
  constructor(message: string, public sqlError?: string) {
    super(message, 400, 'SQL_EXECUTION_ERROR');
  }
}

export class SQLParseError extends AppError {
  constructor(message: string, public query?: string) {
    super(message, 400, 'SQL_PARSE_ERROR');
  }
}

export class SessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, 404, 'SESSION_NOT_FOUND');
  }
}

export class InvalidSessionError extends AppError {
  constructor(message: string = 'Invalid session') {
    super(message, 400, 'INVALID_SESSION');
  }
}
