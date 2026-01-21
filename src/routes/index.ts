// ==========================================
// Route Exports
// ==========================================

import { Router } from 'express';
import { createSessionRoutes } from './session.routes.js';
import { createSQLRoutes } from './sql.routes.js';
import { createFeedbackRoutes } from './feedback.routes.js';
import { SessionController } from '../controllers/session.controller.js';
import { SQLController } from '../controllers/sql.controller.js';
import { FeedbackController } from '../controllers/feedback.controller.js';
import { SessionService } from '../services/session.service.js';

export function createAPIRouter(sessionService: SessionService): Router {
  const router = Router();

  // Create controllers with injected dependencies
  const sessionController = new SessionController(sessionService);
  const sqlController = new SQLController(sessionService);
  const feedbackController = new FeedbackController();

  // Mount routes
  router.use('/sessions', createSessionRoutes(sessionController));
  router.use('/sql', createSQLRoutes(sqlController));
  router.use('/feedback', createFeedbackRoutes(feedbackController));

  /**
   * @openapi
   * /api/health:
   *   get:
   *     tags:
   *       - Health
   *     summary: Health check endpoint
   *     description: Returns the health status of the API server
   *     responses:
   *       200:
   *         description: Server is healthy
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
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-01-15T10:30:00.000Z"
   */
  router.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}

export { createSessionRoutes } from './session.routes.js';
export { createSQLRoutes } from './sql.routes.js';
export { createFeedbackRoutes } from './feedback.routes.js';