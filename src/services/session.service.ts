// ==========================================
// Session Service
// Business logic for session management
// ==========================================

import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import type { Session, CreateSessionResponse } from '../types/index.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { getSessionConnection } from '../config/database.js';
import { SessionNotFoundError, InvalidSessionError } from '../utils/errors.js';

export class SessionService {
  private sessionRepository: SessionRepository;

  constructor(sessionTimeoutMs?: number) {
    this.sessionRepository = new SessionRepository(sessionTimeoutMs);
  }

  /**
   * Create a new session
   */
  async createSession(): Promise<CreateSessionResponse> {
    const sessionId = randomUUID();
    await this.sessionRepository.createSession(sessionId);

    return { sessionId };
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): Session {
    if (!sessionId) {
      throw new InvalidSessionError('Session ID is required');
    }

    const session = this.sessionRepository.getSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    return session;
  }

  /**
   * Get a MySQL connection for a session's database
   */
  async getConnection(sessionId: string): Promise<PoolConnection> {
    if (!sessionId) {
      throw new InvalidSessionError('Session ID is required');
    }

    const schemaName = this.sessionRepository.getSchemaName(sessionId);
    if (!schemaName) {
      throw new SessionNotFoundError(sessionId);
    }

    return await getSessionConnection(sessionId);
  }

  /**
   * Get the schema name for a session
   */
  getSchemaName(sessionId: string): string {
    if (!sessionId) {
      throw new InvalidSessionError('Session ID is required');
    }

    const schemaName = this.sessionRepository.getSchemaName(sessionId);
    if (!schemaName) {
      throw new SessionNotFoundError(sessionId);
    }

    return schemaName;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!sessionId) {
      throw new InvalidSessionError('Session ID is required');
    }

    const deleted = await this.sessionRepository.deleteSession(sessionId);
    if (!deleted) {
      throw new SessionNotFoundError(sessionId);
    }

    return true;
  }

  /**
   * Check if session exists
   */
  sessionExists(sessionId: string): boolean {
    return this.sessionRepository.sessionExists(sessionId);
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { activeSessionCount: number; sessions: Session[] } {
    return {
      activeSessionCount: this.sessionRepository.getSessionCount(),
      sessions: this.sessionRepository.getAllSessions(),
    };
  }

  /**
   * Cleanup resources when shutting down
   */
  async destroy(): Promise<void> {
    await this.sessionRepository.destroy();
  }
}
