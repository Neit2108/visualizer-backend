// ==========================================
// Monitoring Controller
// Handles monitoring endpoint requests
// ==========================================

import type { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../services/monitoring.service.js';
import { asyncHandler } from '../middleware/error-handler.js';

export class MonitoringController {
  private monitoringService: MonitoringService;

  constructor() {
    this.monitoringService = new MonitoringService();
  }

  /**
   * GET /api/monitoring/database
   * Get database connection pool status and health
   */
  getDatabaseStatus = asyncHandler(
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const data = await this.monitoringService.getDatabaseMonitoring();

      res.json({
        success: true,
        data,
      });
    }
  );

  /**
   * GET /api/monitoring/feedback
   * Get feedback metrics and user contacts summary
   */
  getFeedbackStatus = asyncHandler(
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const data = await this.monitoringService.getFeedbackMonitoring();

      res.json({
        success: true,
        data,
      });
    }
  );

  /**
   * GET /api/monitoring/status
   * Get combined status (database + API availability)
   */
  getSystemStatus = asyncHandler(
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const data = await this.monitoringService.getSystemStatus();

      res.json({
        success: true,
        data,
      });
    }
  );
}
