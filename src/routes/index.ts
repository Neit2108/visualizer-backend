// ==========================================
// Route Exports
// ==========================================

import { Router } from 'express';
import { createSessionRoutes } from './session.routes.js';
import { createSQLRoutes } from './sql.routes.js';
import { createFeedbackRoutes } from './feedback.routes.js';
import { createMonitoringRoutes } from './monitoring.routes.js';
import { SessionController } from '../controllers/session.controller.js';
import { SQLController } from '../controllers/sql.controller.js';
import { FeedbackController } from '../controllers/feedback.controller.js';
import { MonitoringController } from '../controllers/monitoring.controller.js';
import { SessionService } from '../services/session.service.js';
import { testDatabaseConnection } from '../config/database.js';

export function createAPIRouter(sessionService: SessionService): Router {
  const router = Router();

  // Create controllers with injected dependencies
  const sessionController = new SessionController(sessionService);
  const sqlController = new SQLController(sessionService);
  const feedbackController = new FeedbackController();
  const monitoringController = new MonitoringController();

  // Mount routes
  router.use('/sessions', createSessionRoutes(sessionController));
  router.use('/sql', createSQLRoutes(sqlController));
  router.use('/feedback', createFeedbackRoutes(feedbackController));
  router.use('/monitoring', createMonitoringRoutes(monitoringController));

  /**
   * @openapi
   * /api/health:
   *   get:
   *     tags:
   *       - Health
   *     summary: Health check endpoint
   *     description: Returns the health status of the API server including database connectivity
   *     responses:
   *       200:
   *         description: Server health status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     status:
   *                       type: string
   *                       example: healthy
   *                     database:
   *                       type: object
   *                       properties:
   *                         connected:
   *                           type: boolean
   *                         responseTime:
   *                           type: number
   *                     uptime:
   *                       type: number
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   */
  router.get('/health', async (_req, res) => {
    const startTime = process.uptime();
    const dbTest = await testDatabaseConnection();

    let status = 'healthy';
    if (!dbTest.connected) {
      status = 'unhealthy';
    } else if (dbTest.responseTime > 1000) {
      status = 'degraded';
    }

    res.json({
      success: true,
      data: {
        status,
        database: {
          connected: dbTest.connected,
          responseTime: dbTest.responseTime,
        },
        uptime: Math.floor(startTime),
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}

export { createSessionRoutes } from './session.routes.js';
export { createSQLRoutes } from './sql.routes.js';
export { createFeedbackRoutes } from './feedback.routes.js';
export { createMonitoringRoutes } from './monitoring.routes.js';