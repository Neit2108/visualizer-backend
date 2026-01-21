// ==========================================
// Session Cleanup Service
// Cronjob to clean up expired sessions every 10 minutes
// ==========================================

import { getPool, dropSessionSchema } from '../config/database.js';
import type { RowDataPacket } from 'mysql2/promise';

interface ExpiredSession extends RowDataPacket {
  id: string;
  schema_name: string;
}

export class SessionCleanupService {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;

  /**
   * @param intervalMinutes - Interval in minutes between cleanup runs (default: 10)
   */
  constructor(intervalMinutes: number = 10) {
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  /**
   * Start the cleanup cronjob
   */
  start(): void {
    if (this.cleanupInterval) {
      console.log('Session cleanup cronjob is already running');
      return;
    }

    console.log(`Starting session cleanup cronjob (every ${this.intervalMs / 60000} minutes)`);

    // Run immediately on start
    void this.cleanupExpiredSessions();

    // Then run at interval
    this.cleanupInterval = setInterval(() => {
      void this.cleanupExpiredSessions();
    }, this.intervalMs);
  }

  /**
   * Stop the cleanup cronjob
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Session cleanup cronjob stopped');
    }
  }

  /**
   * Clean up expired sessions from the database
   */
  async cleanupExpiredSessions(): Promise<number> {
    const startTime = Date.now();
    let cleanedCount = 0;

    try {
      const pool = getPool();
      const connection = await pool.getConnection();

      try {
        // Find all expired sessions
        const [expiredSessions] = await connection.query<ExpiredSession[]>(
          `SELECT id, schema_name 
           FROM sessions 
           WHERE status = 'active' AND expires_at < NOW()`
        );

        if (expiredSessions.length === 0) {
          console.log(`[Cleanup] No expired sessions found`);
          return 0;
        }

        console.log(`[Cleanup] Found ${expiredSessions.length} expired session(s)`);

        // Clean up each expired session
        for (const session of expiredSessions) {
          try {
            // Drop the session's schema (database)
            await dropSessionSchema(session.id);

            // Update the session status to 'expired' in the main database
            await connection.query(
              `UPDATE sessions SET status = 'expired' WHERE id = ?`,
              [session.id]
            );

            cleanedCount++;
            console.log(`[Cleanup] Cleaned up session: ${session.id} (schema: ${session.schema_name})`);
          } catch (error) {
            console.error(`[Cleanup] Error cleaning up session ${session.id}:`, error);
          }
        }

        const duration = Date.now() - startTime;
        console.log(`[Cleanup] Completed: ${cleanedCount}/${expiredSessions.length} sessions cleaned in ${duration}ms`);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[Cleanup] Error during session cleanup:', error);
    }

    return cleanedCount;
  }

  /**
   * Manually trigger cleanup (for testing or admin purposes)
   */
  async triggerCleanup(): Promise<{ cleanedCount: number; message: string }> {
    const cleanedCount = await this.cleanupExpiredSessions();
    return {
      cleanedCount,
      message: `Cleaned up ${cleanedCount} expired session(s)`,
    };
  }

  /**
   * Get cleanup service status
   */
  getStatus(): { running: boolean; intervalMinutes: number } {
    return {
      running: this.cleanupInterval !== null,
      intervalMinutes: this.intervalMs / 60000,
    };
  }
}

// Singleton instance for global access
let cleanupServiceInstance: SessionCleanupService | null = null;

export function getSessionCleanupService(intervalMinutes?: number): SessionCleanupService {
  if (!cleanupServiceInstance) {
    cleanupServiceInstance = new SessionCleanupService(intervalMinutes);
  }
  return cleanupServiceInstance;
}

export function startSessionCleanupCronjob(intervalMinutes: number = 10): SessionCleanupService {
  const service = getSessionCleanupService(intervalMinutes);
  service.start();
  return service;
}

export function stopSessionCleanupCronjob(): void {
  if (cleanupServiceInstance) {
    cleanupServiceInstance.stop();
  }
}
