import { describe, it, expect } from 'vitest';
import { requireRole } from '../../src/middleware/requireRole.js';
import { Role } from '@prisma/client';

describe('RBAC & Role Isolation Security Tests', () => {
  it('should reject participants attempting to access organizer routes with 403', () => {
    const middleware = requireRole([Role.ORGANIZER, Role.ADMIN]);

    const req: any = {
      user: {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@dogfood.local',
        role: Role.PARTICIPANT,
      },
    };
    const res: any = {};
    let errorPassed: any = null;

    middleware(req, res, (err?: any) => {
      errorPassed = err;
    });

    expect(errorPassed).toBeDefined();
    expect(errorPassed.statusCode).toBe(403);
    expect(errorPassed.code).toBe('FORBIDDEN');
  });

  it('should permit organizers to access organizer routes', () => {
    const middleware = requireRole([Role.ORGANIZER, Role.ADMIN]);

    const req: any = {
      user: {
        id: 'user-2',
        name: 'Olivia',
        email: 'organizer@dogfood.local',
        role: Role.ORGANIZER,
      },
    };
    const res: any = {};
    let nextCalled = false;

    middleware(req, res, (err?: any) => {
      if (!err) nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });

  it('should always permit admin superusers to access any route', () => {
    const middleware = requireRole([Role.JUDGE]);

    const req: any = {
      user: {
        id: 'user-3',
        name: 'Admin',
        email: 'admin@dogfood.local',
        role: Role.ADMIN,
      },
    };
    const res: any = {};
    let nextCalled = false;

    middleware(req, res, (err?: any) => {
      if (!err) nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });
});
