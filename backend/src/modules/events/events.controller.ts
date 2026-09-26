import { Request, Response, NextFunction } from 'express';
import { eventsService } from './events.service.js';
import { sendSuccess } from '../../utils/response.js';

export class EventsController {
  async getAllEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const isOrganizerOrAdmin = req.user && (req.user.role === 'ORGANIZER' || req.user.role === 'ADMIN');
      const events = await eventsService.getAllEvents(Boolean(isOrganizerOrAdmin));
      return sendSuccess(res, events, 200);
    } catch (err) {
      next(err);
    }
  }

  async getEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.getEventByIdOrSlug(req.params.idOrSlug);
      return sendSuccess(res, event, 200);
    } catch (err) {
      next(err);
    }
  }

  async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.createEvent(req.body);
      return sendSuccess(res, event, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await eventsService.updateEvent(req.params.id, req.body);
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await eventsService.updateStatus(req.params.id, req.body.status);
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const eventsController = new EventsController();
