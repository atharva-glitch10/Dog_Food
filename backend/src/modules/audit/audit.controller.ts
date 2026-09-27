import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { paginationSchema } from '../../utils/query.js';

const AuditQuerySchema = paginationSchema(50, 100);

export class AuditController {
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;
      const { page: pageNum, limit: limitNum } = AuditQuerySchema.parse(req.query);
      const skip = (pageNum - 1) * limitNum;

      const where = eventId ? { eventId } : {};

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
      ]);

      return sendSuccess(res, {
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      }, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
