import { Request, Response, NextFunction } from 'express';
import { normalizationService, NormalizationMethod } from './normalization.service.js';
import { sendSuccess, AppError } from '../../utils/response.js';

const NORMALIZATION_METHODS: unknown[] = ['Z_SCORE_FALLBACK', 'MIN_MAX'] satisfies NormalizationMethod[];

export class NormalizationController {
  async normalize(req: Request, res: Response, next: NextFunction) {
    try {
      const rawMethod = req.body?.method || req.query?.method;
      if (rawMethod !== undefined && !NORMALIZATION_METHODS.includes(rawMethod)) {
        throw new AppError(
          `Invalid normalization method. Expected one of: ${NORMALIZATION_METHODS.join(', ')}.`,
          400,
          'VALIDATION_ERROR'
        );
      }
      const method = rawMethod as NormalizationMethod | undefined;
      const results = await normalizationService.normalizeScores(req.params.eventId, { method });
      return sendSuccess(res, results, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const normalizationController = new NormalizationController();
