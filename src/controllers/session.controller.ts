// ==========================================
// Session Controller
// HTTP handlers for session management
// ==========================================

import type { Request, Response } from 'express';
import type { ApiResponse, CreateSessionResponse, Session } from '../types/index.js';
import { SessionService } from '../services/session.service.js';

export class SessionController {
  constructor(private sessionService: SessionService) {}

  /**
   * POST /api/sessions
   * Create a new session
   */
  createSession = async (req: Request, res: Response): Promise<void> => {
    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    const result = await this.sessionService.createSession({ clientIp, userAgent });

    const response: ApiResponse<CreateSessionResponse> = {
      success: true,
      data: result,
    };

    res.status(201).json(response);
  };

  /**
   * GET /api/sessions/:sessionId
   * Get session info
   */
  getSession = async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.params['sessionId'] ?? '');
    const session = this.sessionService.getSession(sessionId);

    const response: ApiResponse<Session> = {
      success: true,
      data: session,
    };

    res.json(response);
  };

  /**
   * DELETE /api/sessions/:sessionId
   * Delete a session
   */
  deleteSession = async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.params['sessionId'] ?? '');
    await this.sessionService.deleteSession(sessionId);

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
    };

    res.json(response);
  };

  /**
   * GET /api/sessions
   * Get all sessions (for debugging/admin)
   */
  getAllSessions = async (_req: Request, res: Response): Promise<void> => {
    const stats = this.sessionService.getSessionStats();

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };

    res.json(response);
  };
}
