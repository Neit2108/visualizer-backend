// ==========================================
// Monitoring Service
// Database and Feedback Monitoring
// ==========================================

import { getPoolStatistics, testDatabaseConnection } from '../config/database.js';
import type { RowDataPacket } from 'mysql2/promise';

export interface DatabaseMonitoringData {
  connected: boolean;
  pool: {
    active: number;
    idle: number;
    waiting: number;
    total: number;
    limit: number;
    utilization: number;
  };
  responseTime: number;
  lastChecked: string;
  error?: string | undefined;
}

export interface FeedbackMonitoringData {
  total: number;
  recent: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  byCategory: {
    bug: number;
    feature: number;
    improvement: number;
    other: number;
  };
  averageRating: number;
  uniqueContacts: number;
  lastSubmission: string | null;
}

export interface SystemStatusData {
  database: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    connected: boolean;
    poolUtilization: number;
  };
  api: {
    status: 'available';
    uptime: number;
  };
  feedback: {
    totalSubmissions: number;
    recentActivity: boolean;
  };
  timestamp: string;
}

export class MonitoringService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get database monitoring data
   */
  async getDatabaseMonitoring(): Promise<DatabaseMonitoringData> {
    const poolStats = getPoolStatistics();
    const connectionTest = await testDatabaseConnection();

    const pool = poolStats || {
      active: 0,
      idle: 0,
      waiting: 0,
      total: 0,
      limit: 10,
      utilization: 0,
    };

    // Calculate utilization based on connection test
    // If we can't get exact stats, estimate based on response time
    let utilization = 0;
    if (poolStats && poolStats.limit > 0) {
      // Estimate: if response time is high, pool might be busy
      if (connectionTest.responseTime > 1000) {
        utilization = Math.min(90, (connectionTest.responseTime / 100) * 10);
      } else {
        utilization = Math.min(50, (connectionTest.responseTime / 50) * 10);
      }
    }

    return {
      connected: connectionTest.connected,
      pool: {
        active: pool.active,
        idle: pool.idle,
        waiting: pool.waiting,
        total: pool.total,
        limit: pool.limit,
        utilization: Math.round(utilization * 100) / 100,
      },
      responseTime: connectionTest.responseTime,
      lastChecked: new Date().toISOString(),
      error: connectionTest.error,
    };
  }

  /**
   * Get feedback monitoring data
   */
  async getFeedbackMonitoring(): Promise<FeedbackMonitoringData> {
    const { getPool } = await import('../config/database.js');
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get total count
      const [totalRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM feedback'
      );
      const total = Number(totalRows[0]?.['count']) || 0;

      // Get recent counts
      const [last24hRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM feedback WHERE created_at >= ?',
        [last24h]
      );
      const last24hCount = Number(last24hRows[0]?.['count']) || 0;

      const [last7dRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM feedback WHERE created_at >= ?',
        [last7d]
      );
      const last7dCount = Number(last7dRows[0]?.['count']) || 0;

      const [last30dRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM feedback WHERE created_at >= ?',
        [last30d]
      );
      const last30dCount = Number(last30dRows[0]?.['count']) || 0;

      // Get category breakdown
      const [categoryRows] = await connection.query<RowDataPacket[]>(
        'SELECT category, COUNT(*) as count FROM feedback GROUP BY category'
      );

      const byCategory = {
        bug: 0,
        feature: 0,
        improvement: 0,
        other: 0,
      };

      categoryRows.forEach((row) => {
        const category = row['category'] as keyof typeof byCategory;
        const count = Number(row['count']) || 0;
        if (category in byCategory) {
          byCategory[category] = count;
        }
      });

      // Get average rating
      const [ratingRows] = await connection.query<RowDataPacket[]>(
        'SELECT AVG(rating) as avg FROM feedback'
      );
      const averageRating = Number(ratingRows[0]?.['avg']) || 0;

      // Get unique contacts count
      const [uniqueRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(DISTINCT email) as count FROM feedback'
      );
      const uniqueContacts = Number(uniqueRows[0]?.['count']) || 0;

      // Get last submission timestamp
      const [lastSubmissionRows] = await connection.query<RowDataPacket[]>(
        'SELECT created_at FROM feedback ORDER BY created_at DESC LIMIT 1'
      );
      const lastSubmissionDate = lastSubmissionRows[0]?.['created_at'] as Date | undefined;
      const lastSubmission = lastSubmissionDate ? new Date(lastSubmissionDate).toISOString() : null;

      return {
        total,
        recent: {
          last24h: last24hCount,
          last7d: last7dCount,
          last30d: last30dCount,
        },
        byCategory,
        averageRating: Math.round(averageRating * 100) / 100,
        uniqueContacts,
        lastSubmission,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get combined system status
   */
  async getSystemStatus(): Promise<SystemStatusData> {
    const [databaseData, feedbackData] = await Promise.all([
      this.getDatabaseMonitoring(),
      this.getFeedbackMonitoring(),
    ]);

    // Determine database status
    let dbStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!databaseData.connected) {
      dbStatus = 'unhealthy';
    } else if (
      databaseData.responseTime > 1000 ||
      databaseData.pool.utilization > 80
    ) {
      dbStatus = 'degraded';
    }

    // Calculate uptime
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Determine recent activity (within last 24 hours)
    const recentActivity = feedbackData.recent.last24h > 0;

    return {
      database: {
        status: dbStatus,
        connected: databaseData.connected,
        poolUtilization: databaseData.pool.utilization,
      },
      api: {
        status: 'available',
        uptime,
      },
      feedback: {
        totalSubmissions: feedbackData.total,
        recentActivity,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
