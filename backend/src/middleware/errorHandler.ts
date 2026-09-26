import { Request, Response, NextFunction } from 'express';
import { AppError, sendError } from '../utils/response.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(res, err);
  }

  // Handle SyntaxError for bad JSON in request body
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, new AppError('Malformed JSON payload in request body.', 400, 'INVALID_JSON'));
  }

  // Always log the real error internally
  console.error('Unhandled Exception Caught in errorHandler:', err);

  // Never leak raw exception messages (which may contain SQL, file paths, or internal details)
  // to clients in production — return a generic safe message instead.
  const isProd = process.env.NODE_ENV === 'production';
  const safeMessage = isProd
    ? 'An unexpected internal server error occurred. Please try again later.'
    : err.message || 'Internal server error';

  return sendError(res, new AppError(safeMessage, 500, 'INTERNAL_SERVER_ERROR'));
}
