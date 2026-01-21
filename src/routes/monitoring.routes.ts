// ==========================================
// Monitoring Routes
// Routes for monitoring endpoints
// ==========================================

import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoring.controller.js';

export function createMonitoringRoutes(
  controller: MonitoringController
): Router {
  const router = Router();

  /**
   * @openapi
   * /api/monitoring/database:
   *   get:
   *     tags:
   *       - Monitoring
   *     summary: Get database connection pool status and health
   *     description: Returns database connection pool statistics, connectivity status, and response time
   *     responses:
   *       200:
   *         description: Database monitoring data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     connected:
   *                       type: boolean
   *                     pool:
   *                       type: object
   *                       properties:
   *                         active:
   *                           type: number
   *                         idle:
   *                           type: number
   *                         waiting:
   *                           type: number
   *                         total:
   *                           type: number
   *                         limit:
   *                           type: number
   *                         utilization:
   *                           type: number
   *                     responseTime:
   *                       type: number
   *                     lastChecked:
   *                       type: string
   *                       format: date-time
   */
  router.get('/database', controller.getDatabaseStatus);

  /**
   * @openapi
   * /api/monitoring/feedback:
   *   get:
   *     tags:
   *       - Monitoring
   *     summary: Get feedback metrics and user contacts summary
   *     description: Returns feedback statistics including total submissions, recent activity, category breakdown, and unique contacts
   *     responses:
   *       200:
   *         description: Feedback monitoring data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: number
   *                     recent:
   *                       type: object
   *                       properties:
   *                         last24h:
   *                           type: number
   *                         last7d:
   *                           type: number
   *                         last30d:
   *                           type: number
   *                     byCategory:
   *                       type: object
   *                       properties:
   *                         bug:
   *                           type: number
   *                         feature:
   *                           type: number
   *                         improvement:
   *                           type: number
   *                         other:
   *                           type: number
   *                     averageRating:
   *                       type: number
   *                     uniqueContacts:
   *                       type: number
   *                     lastSubmission:
   *                       type: string
   *                       nullable: true
   */
  router.get('/feedback', controller.getFeedbackStatus);

  /**
   * @openapi
   * /api/monitoring/status:
   *   get:
   *     tags:
   *       - Monitoring
   *     summary: Get combined system status
   *     description: Returns combined status including database health, API availability, and feedback activity
   *     responses:
   *       200:
   *         description: System status data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     database:
   *                       type: object
   *                       properties:
   *                         status:
   *                           type: string
   *                           enum: [healthy, degraded, unhealthy]
   *                         connected:
   *                           type: boolean
   *                         poolUtilization:
   *                           type: number
   *                     api:
   *                       type: object
   *                       properties:
   *                         status:
   *                           type: string
   *                         uptime:
   *                           type: number
   *                     feedback:
   *                       type: object
   *                       properties:
   *                         totalSubmissions:
   *                           type: number
   *                         recentActivity:
   *                           type: boolean
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   */
  router.get('/status', controller.getSystemStatus);

  return router;
}
