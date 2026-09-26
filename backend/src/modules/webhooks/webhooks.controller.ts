import { Request, Response, NextFunction } from 'express';
import { webhookService } from './webhook.service.js';
import { sendSuccess } from '../../utils/response.js';

export class WebhooksController {
  async getSubscriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const subs = await webhookService.getSubscriptions(req.params.eventId);
      return sendSuccess(res, subs, 200);
    } catch (err) {
      next(err);
    }
  }

  async createSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const sub = await webhookService.createSubscription(req.params.eventId, req.body);
      return sendSuccess(res, sub, 201);
    } catch (err) {
      next(err);
    }
  }

  async deleteSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      await webhookService.deleteSubscription(req.params.subscriptionId);
      return sendSuccess(res, { message: 'Subscription removed' }, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const webhooksController = new WebhooksController();
