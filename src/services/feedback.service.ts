// ==========================================
// Feedback Service
// Business Logic for Feedback Management
// ==========================================

import { FeedbackRepository } from '../repositories/feedback.repository.js';
import type {
  Feedback,
  CreateFeedbackRequest,
  FeedbackResponse,
  FeedbackStats,
} from '../types/index.js';

export class FeedbackService {
  constructor(private feedbackRepository: FeedbackRepository = new FeedbackRepository()) {}

  /**
   * Submit new feedback
   * Validates input and creates feedback record
   */
  async submitFeedback(feedbackData: CreateFeedbackRequest): Promise<FeedbackResponse> {
    // Validate input
    this.validateFeedbackInput(feedbackData);

    // Create feedback record
    const feedback = await this.feedbackRepository.create(feedbackData);

    return this.mapFeedbackToResponse(feedback);
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(id: number): Promise<FeedbackResponse> {
    const feedback = await this.feedbackRepository.findById(id);
    return this.mapFeedbackToResponse(feedback);
  }

  /**
   * Get all feedback with pagination
   */
  async getAllFeedback(
    limit: number = 10,
    offset: number = 0
  ): Promise<{
    feedback: FeedbackResponse[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const feedback = await this.feedbackRepository.findAll(limit, offset);
    const total = await this.feedbackRepository.count();
    const page = Math.floor(offset / limit) + 1;

    return {
      feedback: feedback.map((f) => this.mapFeedbackToResponse(f)),
      total,
      page,
      pageSize: limit,
    };
  }

  /**
   * Get feedback by session ID
   */
  async getFeedbackBySessionId(sessionId: string): Promise<FeedbackResponse[]> {
    const feedback = await this.feedbackRepository.findBySessionId(sessionId);
    return feedback.map((f) => this.mapFeedbackToResponse(f));
  }

  /**
   * Get feedback by email
   */
  async getFeedbackByEmail(email: string): Promise<FeedbackResponse[]> {
    const feedback = await this.feedbackRepository.findByEmail(email);
    return feedback.map((f) => this.mapFeedbackToResponse(f));
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<FeedbackStats> {
    return this.feedbackRepository.getStats();
  }

  /**
   * Update feedback
   */
  async updateFeedback(
    id: number,
    updates: Partial<CreateFeedbackRequest>
  ): Promise<FeedbackResponse> {
    // Validate updates if provided
    if (Object.keys(updates).length > 0) {
      this.validateFeedbackInput(updates as CreateFeedbackRequest);
    }

    const feedback = await this.feedbackRepository.update(id, updates);
    return this.mapFeedbackToResponse(feedback);
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(id: number): Promise<boolean> {
    return this.feedbackRepository.delete(id);
  }

  /**
   * Validate feedback input
   */
  private validateFeedbackInput(data: Partial<CreateFeedbackRequest>): void {
    // Validate email if provided
    if (data.email !== undefined) {
      if (!data.email || typeof data.email !== 'string') {
        throw new Error('Email is required and must be a string');
      }
      if (!this.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Validate rating if provided
    if (data.rating !== undefined) {
      if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
        throw new Error('Rating must be a number between 1 and 5');
      }
    }

    // Validate category if provided
    if (data.category !== undefined) {
      const validCategories = ['bug', 'feature', 'improvement', 'other'];
      if (!validCategories.includes(data.category)) {
        throw new Error(
          `Category must be one of: ${validCategories.join(', ')}`
        );
      }
    }

    // Validate message if provided
    if (data.message !== undefined) {
      if (!data.message || typeof data.message !== 'string') {
        throw new Error('Message is required and must be a string');
      }
      if (data.message.length < 10) {
        throw new Error('Message must be at least 10 characters long');
      }
      if (data.message.length > 5000) {
        throw new Error('Message cannot exceed 5000 characters');
      }
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Map Feedback entity to FeedbackResponse
   */
  private mapFeedbackToResponse(feedback: Feedback): FeedbackResponse {
    return {
      id: feedback.id,
      email: feedback.email,
      rating: feedback.rating,
      category: feedback.category,
      message: feedback.message,
      createdAt: feedback.createdAt.toISOString(),
    };
  }
}
