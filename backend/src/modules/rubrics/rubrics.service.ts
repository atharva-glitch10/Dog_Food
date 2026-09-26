import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';

export interface CriterionInput {
  title: string;
  description: string;
  weight: number; // e.g., 0.3 for 30% or 30 for 30%
  maxScore?: number;
  orderIndex?: number;
}

export class RubricsService {
  async getRubricByEvent(eventId: string) {
    return prisma.rubric.findUnique({
      where: { eventId },
      include: {
        criteria: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async createOrUpdateRubric(eventId: string, data: { name: string; description?: string; criteria: CriterionInput[] }) {
    if (!data.criteria || data.criteria.length === 0) {
      throw new AppError('A rubric must contain at least one criterion.', 400, 'EMPTY_RUBRIC');
    }

    // Normalize weights if entered as percentages (e.g. 30 instead of 0.3)
    let totalWeight = data.criteria.reduce((sum, c) => sum + c.weight, 0);
    const normalizedCriteria = data.criteria.map((c, index) => {
      let w = c.weight;
      if (totalWeight > 1.5) {
        w = c.weight / totalWeight; // Convert 30, 30, 40 to 0.3, 0.3, 0.4
      }
      return {
        title: c.title,
        description: c.description,
        weight: w,
        maxScore: c.maxScore || 10,
        orderIndex: c.orderIndex !== undefined ? c.orderIndex : index,
      };
    });

    const sumNorm = normalizedCriteria.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(sumNorm - 1.0) > 0.01) {
      throw new AppError('Criterion weights must sum to 100% (1.0).', 400, 'INVALID_RUBRIC_WEIGHTS');
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.rubric.findUnique({ where: { eventId } });

      let rubric;
      if (existing) {
        rubric = await tx.rubric.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            description: data.description || null,
          },
        });
        // Remove old criteria
        await tx.rubricCriterion.deleteMany({ where: { rubricId: rubric.id } });
      } else {
        rubric = await tx.rubric.create({
          data: {
            eventId,
            name: data.name,
            description: data.description || null,
          },
        });
      }

      await tx.rubricCriterion.createMany({
        data: normalizedCriteria.map((c) => ({
          rubricId: rubric.id,
          title: c.title,
          description: c.description,
          weight: c.weight,
          maxScore: c.maxScore,
          orderIndex: c.orderIndex,
        })),
      });

      return tx.rubric.findUnique({
        where: { id: rubric.id },
        include: { criteria: { orderBy: { orderIndex: 'asc' } } },
      });
    });
  }
}

export const rubricsService = new RubricsService();
