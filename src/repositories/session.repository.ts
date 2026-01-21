// ==========================================
// Session Repository
// Manages session storage and lifecycle with MySQL
// ==========================================

import type { Session, CreateSessionClientInfo } from '../types/index.js';
import {
  createSessionSchema,
  createSessionManagement,
  dropSessionSchema,
} from '../config/database.js';

interface SessionEntry {
  session: Session;
  schemaName: string;
}

export class SessionRepository {
  private sessions = new Map<string, SessionEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private sessionTimeoutMs: number = 3600000) {
    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      void this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Create a new session with a MySQL schema
   */
  async createSession(sessionId: string, clientInfo?: CreateSessionClientInfo): Promise<Session> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeoutMs);

    const session: Session = {
      id: sessionId,
      createdAt: now,
      lastAccessedAt: now,
    };

    // Create a dedicated schema for this session
    const schemaName = await createSessionSchema(sessionId);

    // Insert session record into the main database's sessions table
    await createSessionManagement({
      sessionId,
      schemaName,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      status: 'active',
      clientIp: clientInfo?.clientIp ?? 'unknown',
      userAgent: clientInfo?.userAgent ?? 'unknown',
      queryCount: 0,
      tableCount: 0,
    });

    this.sessions.set(sessionId, { session, schemaName });

    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;

    // Update last accessed time
    entry.session.lastAccessedAt = new Date();

    return entry.session;
  }

  /**
   * Get the schema name for a session
   */
  getSchemaName(sessionId: string): string | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;

    // Update last accessed time
    entry.session.lastAccessedAt = new Date();

    return entry.schemaName;
  }

  /**
   * Delete a session and its database schema
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const entry = this.sessions.get(sessionId);
    if (!entry) return false;

    // Drop the session's schema
    await dropSessionSchema(sessionId);
    this.sessions.delete(sessionId);

    return true;
  }

  /**
   * Check if a session exists
   */
  sessionExists(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values()).map((entry) => entry.session);
  }

  /**
   * Get the count of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    const expiredSessions: string[] = [];

    for (const [sessionId, entry] of this.sessions.entries()) {
      const lastAccessed = entry.session.lastAccessedAt.getTime();
      if (now - lastAccessed > this.sessionTimeoutMs) {
        expiredSessions.push(sessionId);
      }
    }

    // Clean up expired sessions
    for (const sessionId of expiredSessions) {
      try {
        await dropSessionSchema(sessionId);
        this.sessions.delete(sessionId);
        cleanedCount++;
        console.log(`Cleaned up expired session: ${sessionId}`);
      } catch (error) {
        console.error(`Error cleaning up session ${sessionId}:`, error);
      }
    }

    return cleanedCount;
  }

  /**
   * Destroy the repository (cleanup all sessions)
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const sessionIds = Array.from(this.sessions.keys());

    for (const sessionId of sessionIds) {
      try {
        await dropSessionSchema(sessionId);
        this.sessions.delete(sessionId);
      } catch (error) {
        console.error(`Error destroying session ${sessionId}:`, error);
      }
    }
  }
}
