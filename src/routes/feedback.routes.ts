// ==========================================
// Feedback Routes
// ==========================================

import { Router } from 'express';
import { FeedbackController } from '../controllers/feedback.controller.js';

export function createFeedbackRoutes(controller: FeedbackController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/feedback:
   *   post:
   *     tags:
   *       - Feedback
   *     summary: Submit new feedback
   *     description: Submit user feedback about the SQL visualization tool
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - rating
   *               - category
   *               - message
   *             properties:
   *               sessionId:
   *                 type: string
   *                 description: Optional session ID
   *                 example: "550e8400-e29b-41d4-a716-446655440000"
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address
   *                 example: "user@example.com"
   *               rating:
   *                 type: number
   *                 description: Rating from 1 to 5 stars
   *                 example: 5
   *               category:
   *                 type: string
   *                 enum: [bug, feature, improvement, other]
   *                 description: Feedback category
   *                 example: "feature"
   *               message:
   *                 type: string
   *                 description: Detailed feedback message
   *                 example: "Great tool! It would be nice to have real-time collaboration."
   *     responses:
   *       201:
   *         description: Feedback submitted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Feedback submitted successfully"
   *                 data:
   *                   $ref: '#/components/schemas/FeedbackResponse'
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Server error
   */
  router.post('/', (req, res, next) => controller.submitFeedback(req, res, next));

  /**
   * @openapi
   * /api/feedback:
   *   get:
   *     tags:
   *       - Feedback
   *     summary: Get all feedback
   *     description: Retrieve all feedback with pagination
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *           default: 10
   *         description: Number of results per page (1-100)
   *       - in: query
   *         name: offset
   *         schema:
   *           type: number
   *           default: 0
   *         description: Number of results to skip
   *     responses:
   *       200:
   *         description: List of feedback
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/FeedbackResponse'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: number
   *                     pageSize:
   *                       type: number
   *                     total:
   *                       type: number
   *                     totalPages:
   *                       type: number
   */
  router.get('/', (req, res, next) => controller.getAllFeedback(req, res, next));

  /**
   * @openapi
   * /api/feedback/stats:
   *   get:
   *     tags:
   *       - Feedback
   *     summary: Get feedback statistics
   *     description: Get aggregated feedback statistics including average rating and category breakdown
   *     responses:
   *       200:
   *         description: Feedback statistics
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
   *                     totalFeedback:
   *                       type: number
   *                     averageRating:
   *                       type: number
   *                     categoryBreakdown:
   *                       type: object
   */
  router.get('/stats', (req, res, next) => controller.getFeedbackStats(req, res, next));

  /**
   * @openapi
   * /api/feedback/{id}:
   *   get:
   *     tags:
   *       - Feedback
   *     summary: Get feedback by ID
   *     description: Retrieve a specific feedback record
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: number
   *         description: Feedback ID
   *     responses:
   *       200:
   *         description: Feedback record
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/FeedbackResponse'
   *       404:
   *         description: Feedback not found
   */
  router.get('/:id', (req, res, next) => controller.getFeedbackById(req, res, next));

  /**
   * @openapi
   * /api/feedback/session/{sessionId}:
   *   get:
   *     tags:
   *       - Feedback
   *     summary: Get feedback by session ID
   *     description: Retrieve all feedback for a specific session
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID
   *     responses:
   *       200:
   *         description: List of feedback for session
   */
  router.get('/session/:sessionId', (req, res, next) => {
    controller.getFeedbackBySessionId(req, res, next);
  });

  /**
   * @openapi
   * /api/feedback/email/{email}:
   *   get:
   *     tags:
   *       - Feedback
   *     summary: Get feedback by email
   *     description: Retrieve all feedback submitted by a specific email
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *         description: Email address
   *     responses:
   *       200:
   *         description: List of feedback by email
   */
  router.get('/email/:email', (req, res, next) => {
    controller.getFeedbackByEmail(req, res, next);
  });

  /**
   * @openapi
   * /api/feedback/{id}:
   *   put:
   *     tags:
   *       - Feedback
   *     summary: Update feedback
   *     description: Update an existing feedback record
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: number
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               rating:
   *                 type: number
   *               category:
   *                 type: string
   *               message:
   *                 type: string
   *     responses:
   *       200:
   *         description: Feedback updated successfully
   */
  router.put('/:id', (req, res, next) => controller.updateFeedback(req, res, next));

  /**
   * @openapi
   * /api/feedback/{id}:
   *   delete:
   *     tags:
   *       - Feedback
   *     summary: Delete feedback
   *     description: Delete a feedback record
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: number
   *     responses:
   *       200:
   *         description: Feedback deleted successfully
   *       404:
   *         description: Feedback not found
   */
  router.delete('/:id', (req, res, next) => controller.deleteFeedback(req, res, next));

  return router;
}
