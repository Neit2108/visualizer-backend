// ==========================================
// Feedback Repository
// Data Access Layer for Feedback
// ==========================================

import { getPool } from '../config/database.js';
import type { Pool } from '../config/database.js';
import type { Feedback, CreateFeedbackRequest, FeedbackStats } from '../types/index.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export class FeedbackRepository {
  private db: Pool;

  constructor(db?: Pool) {
    this.db = db || getPool();
  }

  /**
   * Create a new feedback record
   */
  async create(feedbackData: CreateFeedbackRequest): Promise<Feedback> {
    const connection = await this.db.getConnection();
    try {
      const query = `
        INSERT INTO feedback (session_id, email, rating, category, message, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const [result] = await connection.query<ResultSetHeader>(query, [
        feedbackData.sessionId || null,
        feedbackData.email,
        feedbackData.rating,
        feedbackData.category,
        feedbackData.message,
      ]);

      // Fetch the created record
      return this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * Get feedback by ID
   */
  async findById(id: number): Promise<Feedback> {
    const connection = await this.db.getConnection();
    try {
      const query = 'SELECT * FROM feedback WHERE id = ?';
      const [rows] = await connection.query<RowDataPacket[]>(query, [id]);

      if (rows.length === 0) {
        throw new Error(`Feedback with ID ${id} not found`);
      }

      const row = rows[0];
      if (!row) {
        throw new Error(`Feedback with ID ${id} not found`);
      }

      return this.mapRowToFeedback(row);
    } finally {
      connection.release();
    }
  }

  /**
   * Get all feedback with optional filtering
   */
  async findAll(limit?: number, offset?: number): Promise<Feedback[]> {
    const connection = await this.db.getConnection();
    try {
      let query = 'SELECT * FROM feedback ORDER BY created_at DESC';
      const params: (number | undefined)[] = [];

      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);

        if (offset !== undefined) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const [rows] = await connection.query<RowDataPacket[]>(query, params);
      return rows.map((row) => this.mapRowToFeedback(row));
    } finally {
      connection.release();
    }
  }

  /**
   * Get feedback by session ID
   */
  async findBySessionId(sessionId: string): Promise<Feedback[]> {
    const connection = await this.db.getConnection();
    try {
      const query = 'SELECT * FROM feedback WHERE session_id = ? ORDER BY created_at DESC';
      const [rows] = await connection.query<RowDataPacket[]>(query, [sessionId]);
      return rows.map((row) => this.mapRowToFeedback(row));
    } finally {
      connection.release();
    }
  }

  /**
   * Get feedback by email
   */
  async findByEmail(email: string): Promise<Feedback[]> {
    const connection = await this.db.getConnection();
    try {
      const query = 'SELECT * FROM feedback WHERE email = ? ORDER BY created_at DESC';
      const [rows] = await connection.query<RowDataPacket[]>(query, [email]);
      return rows.map((row) => this.mapRowToFeedback(row));
    } finally {
      connection.release();
    }
  }

  /**
   * Get feedback statistics
   */
  async getStats(): Promise<FeedbackStats> {
    const connection = await this.db.getConnection();
    try {
      // Get total count and average rating
      const statsQuery = `
        SELECT 
          COUNT(*) as total_feedback,
          AVG(rating) as average_rating
        FROM feedback
      `;
      const [statsRows] = await connection.query<RowDataPacket[]>(statsQuery);

      // Get category breakdown
      const categoryQuery = `
        SELECT 
          category,
          COUNT(*) as count
        FROM feedback
        GROUP BY category
      `;
      const [categoryRows] = await connection.query<RowDataPacket[]>(categoryQuery);

      const categoryBreakdown: Record<string, number> = {};
      categoryRows.forEach((row) => {
        categoryBreakdown[row['category'] as string] = row['count'] as number;
      });

      const firstStats = statsRows[0];
      return {
        totalFeedback: (firstStats?.['total_feedback'] as number) || 0,
        averageRating: (firstStats?.['average_rating'] as number) || 0,
        categoryBreakdown,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Update feedback record
   */
  async update(id: number, updates: Partial<CreateFeedbackRequest>): Promise<Feedback> {
    const connection = await this.db.getConnection();
    try {
      const allowedFields: (keyof CreateFeedbackRequest)[] = [
        'email',
        'rating',
        'category',
        'message',
      ];
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      for (const field of allowedFields) {
        if (field in updates && updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updates[field]);
        }
      }

      if (updateFields.length === 0) {
        return this.findById(id);
      }

      updateValues.push(id);
      const query = `
        UPDATE feedback
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;

      await connection.query(query, updateValues);
      return this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Delete feedback record
   */
  async delete(id: number): Promise<boolean> {
    const connection = await this.db.getConnection();
    try {
      const query = 'DELETE FROM feedback WHERE id = ?';
      const [result] = await connection.query<ResultSetHeader>(query, [id]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get feedback count
   */
  async count(): Promise<number> {
    const connection = await this.db.getConnection();
    try {
      const query = 'SELECT COUNT(*) as count FROM feedback';
      const [rows] = await connection.query<RowDataPacket[]>(query);
      return (rows[0]?.['count'] as number) || 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Map database row to Feedback object
   */
  private mapRowToFeedback(row: Record<string, unknown>): Feedback {
    return {
      id: row['id'] as number,
      sessionId: (row['session_id'] as string | null) || undefined,
      email: row['email'] as string,
      rating: row['rating'] as number,
      category: row['category'] as 'bug' | 'feature' | 'improvement' | 'other',
      message: row['message'] as string,
      createdAt: row['created_at'] as Date,
      updatedAt: row['updated_at'] as Date,
    };
  }
}
