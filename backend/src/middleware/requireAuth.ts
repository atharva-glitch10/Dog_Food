import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { verifyToken } from '../utils/crypto.js';
import { AppError } from '../utils/response.js';
import { config } from '../config/index.js';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  bio?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionToken?: string;
    }
  }
}

// ---------------------------------------------------------------------------
// In-memory user-profile cache (60s TTL) — avoids a DB round-trip on every
// authenticated request while still reflecting role/active changes quickly.
// ---------------------------------------------------------------------------
interface CachedUser {
  user: AuthUser;
  cachedAt: number;
}
const USER_CACHE_TTL_MS = 60_000;
const userCache = new Map<string, CachedUser>();

// Evict expired cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userCache) {
    if (now - entry.cachedAt > USER_CACHE_TTL_MS) userCache.delete(key);
  }
}, 5 * 60 * 1000).unref();

/** Call this whenever a user's profile or role changes so the cache is immediately invalidated. */
export function invalidateUserCache(userId: string) {
  userCache.delete(userId);
}

// ---------------------------------------------------------------------------
// Token extraction helper — supports both HttpOnly cookie and Bearer header
// ---------------------------------------------------------------------------
function extractToken(req: Request): string | undefined {
  if (req.cookies?.[config.cookieName]) return req.cookies[config.cookieName];
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.split(' ')[1];
  return undefined;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED'));
    }

    // 1. Verify JWT signature & decode payload
    let decoded: { userId: string; email: string; role: Role };
    try {
      decoded = verifyToken<{ userId: string; email: string; role: Role }>(token);
    } catch {
      return next(new AppError('Invalid or expired authentication session.', 401, 'INVALID_SESSION'));
    }

    // 2. Verify the session row exists in the DB and has not been revoked/expired.
    //    This is what makes logout actually work — the session row is deleted on logout,
    //    so subsequent requests with the same token will fail here.
    const session = await prisma.session.findUnique({
      where: { token },
      select: { expiresAt: true, userId: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return next(new AppError('Session has expired. Please log in again.', 401, 'SESSION_EXPIRED'));
    }

    // 3. Resolve user profile — check in-process cache first to avoid repeated DB reads
    const cached = userCache.get(decoded.userId);
    if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
      req.user = cached.user;
      req.sessionToken = token;
      return next();
    }

    // Cache miss — fetch from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        avatarUrl: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return next(new AppError('User account not found or deactivated.', 401, 'ACCOUNT_INACTIVE'));
    }

    userCache.set(decoded.userId, { user: user as AuthUser, cachedAt: Date.now() });
    req.user = user as AuthUser;
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (token) {
      try {
        const decoded = verifyToken<{ userId: string }>(token);

        // Also enforce session validity for optional auth paths
        const session = await prisma.session.findUnique({
          where: { token },
          select: { expiresAt: true },
        });

        if (session && session.expiresAt >= new Date()) {
          const cached = userCache.get(decoded.userId);
          if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
            req.user = cached.user;
            req.sessionToken = token;
          } else {
            const user = await prisma.user.findUnique({
              where: { id: decoded.userId },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                bio: true,
                avatarUrl: true,
                isActive: true,
              },
            });
            if (user && user.isActive) {
              userCache.set(decoded.userId, { user: user as AuthUser, cachedAt: Date.now() });
              req.user = user as AuthUser;
              req.sessionToken = token;
            }
          }
        }
      } catch {
        // Ignore invalid token for optional auth
      }
    }
    next();
  } catch {
    next();
  }
}
