import { Request, Response, NextFunction } from 'express';
import { rubricsService } from './rubrics.service.js';
import { sendSuccess } from '../../utils/response.js';

export class RubricsController {
  async getRubric(req: Request, res: Response, next: NextFunction) {
    try {
      const rubric = await rubricsService.getRubricByEvent(req.params.eventId);
      return sendSuccess(res, rubric, 200);
    } catch (err) {
      next(err);
    }
  }

  async saveRubric(req: Request, res: Response, next: NextFunction) {
    try {
      const rubric = await rubricsService.createOrUpdateRubric(req.params.eventId, req.body);
      return sendSuccess(res, rubric, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const rubricsController = new RubricsController();
