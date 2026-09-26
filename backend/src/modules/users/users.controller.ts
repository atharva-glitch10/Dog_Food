import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess, AppError } from '../../utils/response.js';
import { Role } from '@prisma/client';

export class UsersController {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          bio: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { teamMembers: true, judges: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, users, 200);
    } catch (err) {
      next(err);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = req.body as { role: Role };
      const updated = await prisma.user.update({
        where: { id: req.params.userId },
        data: { role },
        select: { id: true, email: true, name: true, role: true },
      });
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
      if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

      const updated = await prisma.user.update({
        where: { id: req.params.userId },
        data: { isActive: !user.isActive },
        select: { id: true, email: true, name: true, isActive: true },
      });
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
