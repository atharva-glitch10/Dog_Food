import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';
import { config } from '../../config/index.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);

      res.cookie(config.cookieName, result.token, {
        httpOnly: true,
        secure: isSecureCookie(req),
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login({
        ...req.body,
        ipAddress,
        userAgent,
      });

      res.cookie(config.cookieName, result.token, {
        httpOnly: true,
        secure: isSecureCookie(req),
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.sessionToken, req.user?.id);
      res.clearCookie(config.cookieName);
      return sendSuccess(res, { message: 'Logged out successfully.' }, 200);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.user!.id);
      return sendSuccess(res, user, 200);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await authService.updateProfile(req.user!.id, req.body);
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }
}

// "auto" (default) marks the cookie Secure only when the request arrived over
// HTTPS (honouring X-Forwarded-Proto from a trusted proxy), so plain-HTTP LAN
// access keeps working while HTTPS deployments get Secure cookies.
function isSecureCookie(req: Request): boolean {
  if (config.cookieSecure === 'true') return true;
  if (config.cookieSecure === 'false') return false;
  return req.secure;
}

export const authController = new AuthController();
