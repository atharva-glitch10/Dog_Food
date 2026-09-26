import { Request, Response, NextFunction } from 'express';
import { votingService } from './voting.service.js';
import { sendSuccess } from '../../utils/response.js';

export class VotingController {
  async castVote(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const vote = await votingService.castVote(
        req.params.eventId,
        req.params.projectId,
        req.user?.id,
        ipAddress,
        userAgent
      );
      return sendSuccess(res, vote, 201);
    } catch (err) {
      next(err);
    }
  }

  async getMyVotes(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const votes = await votingService.getMyVotes(req.params.eventId, req.user?.id, ipAddress);
      return sendSuccess(res, votes, 200);
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await votingService.getVotingStats(req.params.eventId);
      return sendSuccess(res, stats, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const votingController = new VotingController();
