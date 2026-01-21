// ==========================================
// Feedback Controller
// HTTP Request Handlers for Feedback API
// ==========================================

import type { Request, Response, NextFunction } from 'express';
import { FeedbackService } from '../services/feedback.service.js';
import type { CreateFeedbackRequest } from '../types/index.js';

export class FeedbackController {
  constructor(private feedbackService: FeedbackService = new FeedbackService()) {}

  /**
   * POST /api/feedback
   * Submit new feedback
   */
  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedbackData: CreateFeedbackRequest = req.body;

      const feedback = await this.feedbackService.submitFeedback(feedbackData);

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feedback/:id
   * Get feedback by ID
   */
  async getFeedbackById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const feedbackId = parseInt(id, 10);

      if (isNaN(feedbackId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Feedback ID must be a valid number',
          },
        });
        return;
      }

      const feedback = await this.feedbackService.getFeedbackById(feedbackId);

      res.json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feedback
   * Get all feedback with pagination
   */
  async getAllFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query['limit'] as string) || 10;
      const offset = parseInt(req.query['offset'] as string) || 0;

      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LIMIT',
            message: 'Limit must be between 1 and 100',
          },
        });
        return;
      }

      if (offset < 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OFFSET',
            message: 'Offset must be non-negative',
          },
        });
        return;
      }

      const result = await this.feedbackService.getAllFeedback(limit, offset);

      res.json({
        success: true,
        data: result.feedback,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feedback/session/:sessionId
   * Get feedback by session ID
   */
  async getFeedbackBySessionId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params as { sessionId: string };

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SESSION_ID',
            message: 'Session ID is required',
          },
        });
        return;
      }

      const feedback = await this.feedbackService.getFeedbackBySessionId(sessionId);

      res.json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feedback/email/:email
   * Get feedback by email
   */
  async getFeedbackByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.params as { email: string };

      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_EMAIL',
            message: 'Email is required',
          },
        });
        return;
      }

      const feedback = await this.feedbackService.getFeedbackByEmail(email);

      res.json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/feedback/stats
   * Get feedback statistics
   */
  async getFeedbackStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.feedbackService.getFeedbackStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/feedback/:id
   * Update feedback
   */
  async updateFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const feedbackId = parseInt(id, 10);

      if (isNaN(feedbackId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Feedback ID must be a valid number',
          },
        });
        return;
      }

      const updates: Partial<CreateFeedbackRequest> = req.body;
      const feedback = await this.feedbackService.updateFeedback(feedbackId, updates);

      res.json({
        success: true,
        message: 'Feedback updated successfully',
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/feedback/:id
   * Delete feedback
   */
  async deleteFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const feedbackId = parseInt(id, 10);

      if (isNaN(feedbackId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Feedback ID must be a valid number',
          },
        });
        return;
      }

      const deleted = await this.feedbackService.deleteFeedback(feedbackId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Feedback with ID ${feedbackId} not found`,
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Feedback deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
