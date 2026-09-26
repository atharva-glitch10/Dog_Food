import { Request, Response, NextFunction } from 'express';
import { assignmentService } from './assignment.service.js';
import { sendSuccess } from '../../utils/response.js';

export class AssignmentsController {
  async autoAssign(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assignmentService.autoAssignJudges(req.params.eventId, req.body);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async manualAssign(req: Request, res: Response, next: NextFunction) {
    try {
      const assignment = await assignmentService.manualAssign(
        req.params.eventId,
        req.body.judgeId,
        req.body.projectId
      );
      return sendSuccess(res, assignment, 201);
    } catch (err) {
      next(err);
    }
  }

  async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      await assignmentService.removeAssignment(req.params.assignmentId);
      return sendSuccess(res, { message: 'Assignment removed' }, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const assignmentsController = new AssignmentsController();
