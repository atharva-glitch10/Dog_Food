import { prisma } from '../../utils/prisma.js';
import { normalizeRubricCriteria, RubricCriterionInput } from '../scoring/scoring.engine.js';

export type CriterionInput = RubricCriterionInput;

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
    // Percent -> fraction conversion, defaults, and the sum-to-100% check (pure)
    const normalizedCriteria = normalizeRubricCriteria(data.criteria);

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
