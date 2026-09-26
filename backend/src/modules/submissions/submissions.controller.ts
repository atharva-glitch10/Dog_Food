import { Request, Response, NextFunction } from 'express';
import { submissionsService } from './submissions.service.js';
import { sendSuccess } from '../../utils/response.js';

export class SubmissionsController {
  async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await submissionsService.getProjectById(req.params.id, req.user);
      return sendSuccess(res, project, 200);
    } catch (err) {
      next(err);
    }
  }

  async getSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const submissions = await submissionsService.getSubmissionsByEvent(req.params.eventId, req.user);
      return sendSuccess(res, submissions, 200);
    } catch (err) {
      next(err);
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await submissionsService.createProject(req.params.eventId, req.user!.id, req.body);
      return sendSuccess(res, project, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await submissionsService.updateProject(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.body
      );
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  async submitProject(req: Request, res: Response, next: NextFunction) {
    try {
      const submitted = await submissionsService.submitProject(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      return sendSuccess(res, submitted, 200);
    } catch (err) {
      next(err);
    }
  }

  async finalizeProject(req: Request, res: Response, next: NextFunction) {
    try {
      const finalized = await submissionsService.finalizeProject(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      return sendSuccess(res, finalized, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const submissionsController = new SubmissionsController();
