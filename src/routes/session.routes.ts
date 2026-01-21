// ==========================================
// Session Routes
// ==========================================

import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { asyncHandler } from '../middleware/error-handler.js';

export function createSessionRoutes(sessionController: SessionController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/sessions:
   *   post:
   *     tags:
   *       - Sessions
   *     summary: Create a new session
   *     description: Creates a new isolated MySQL database session. Each session has its own schema/database.
   *     responses:
   *       201:
   *         description: Session created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/CreateSessionResponse'
   *             example:
   *               success: true
   *               data:
   *                 sessionId: "550e8400-e29b-41d4-a716-446655440000"
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   */
  router.post('/', asyncHandler(sessionController.createSession));

  /**
   * @openapi
   * /api/sessions:
   *   get:
   *     tags:
   *       - Sessions
   *     summary: List all sessions
   *     description: Returns statistics about all active sessions. Useful for debugging and monitoring.
   *     responses:
   *       200:
   *         description: Session statistics retrieved successfully
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
   *                     activeSessions:
   *                       type: integer
   *                       description: Number of active sessions
   *                       example: 5
   *                     sessions:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Session'
   */
  router.get('/', asyncHandler(sessionController.getAllSessions));

  /**
   * @openapi
   * /api/sessions/{sessionId}:
   *   get:
   *     tags:
   *       - Sessions
   *     summary: Get session info
   *     description: Retrieves details about a specific session, including creation and last access timestamps.
   *     parameters:
   *       - name: sessionId
   *         in: path
   *         required: true
   *         description: The unique session identifier
   *         schema:
   *           type: string
   *           format: uuid
   *         example: 550e8400-e29b-41d4-a716-446655440000
   *     responses:
   *       200:
   *         description: Session info retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Session'
   *       404:
   *         description: Session not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   $ref: '#/components/schemas/ApiError'
   *             example:
   *               success: false
   *               error:
   *                 code: "NOT_FOUND"
   *                 message: "Session not found"
   */
  router.get('/:sessionId', asyncHandler(sessionController.getSession));

  /**
   * @openapi
   * /api/sessions/{sessionId}:
   *   delete:
   *     tags:
   *       - Sessions
   *     summary: Delete a session
   *     description: Deletes a session and its associated database schema. This action cannot be undone.
   *     parameters:
   *       - name: sessionId
   *         in: path
   *         required: true
   *         description: The unique session identifier to delete
   *         schema:
   *           type: string
   *           format: uuid
   *         example: 550e8400-e29b-41d4-a716-446655440000
   *     responses:
   *       200:
   *         description: Session deleted successfully
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
   *                     deleted:
   *                       type: boolean
   *                       example: true
   *       404:
   *         description: Session not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   $ref: '#/components/schemas/ApiError'
   */
  router.delete('/:sessionId', asyncHandler(sessionController.deleteSession));

  return router;
}
