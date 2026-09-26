import { Request, Response, NextFunction } from 'express';
import { tracksPrizesService } from './tracks-prizes.service.js';
import { sendSuccess } from '../../utils/response.js';

export class TracksPrizesController {
  async getTracks(req: Request, res: Response, next: NextFunction) {
    try {
      const tracks = await tracksPrizesService.getTracksByEvent(req.params.eventId);
      return sendSuccess(res, tracks, 200);
    } catch (err) {
      next(err);
    }
  }

  async createTrack(req: Request, res: Response, next: NextFunction) {
    try {
      const track = await tracksPrizesService.createTrack(req.params.eventId, req.body);
      return sendSuccess(res, track, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateTrack(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await tracksPrizesService.updateTrack(req.params.trackId, req.body);
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  async deleteTrack(req: Request, res: Response, next: NextFunction) {
    try {
      await tracksPrizesService.deleteTrack(req.params.trackId);
      return sendSuccess(res, { message: 'Track deleted successfully' }, 200);
    } catch (err) {
      next(err);
    }
  }

  async getPrizes(req: Request, res: Response, next: NextFunction) {
    try {
      const prizes = await tracksPrizesService.getPrizesByEvent(req.params.eventId);
      return sendSuccess(res, prizes, 200);
    } catch (err) {
      next(err);
    }
  }

  async createPrize(req: Request, res: Response, next: NextFunction) {
    try {
      const prize = await tracksPrizesService.createPrize(req.params.eventId, req.body);
      return sendSuccess(res, prize, 201);
    } catch (err) {
      next(err);
    }
  }

  async updatePrize(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await tracksPrizesService.updatePrize(req.params.prizeId, req.body);
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  async deletePrize(req: Request, res: Response, next: NextFunction) {
    try {
      await tracksPrizesService.deletePrize(req.params.prizeId);
      return sendSuccess(res, { message: 'Prize deleted successfully' }, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const tracksPrizesController = new TracksPrizesController();
