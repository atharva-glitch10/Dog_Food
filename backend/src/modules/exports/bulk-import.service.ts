import { prisma } from '../../utils/prisma.js';
import { hashPassword } from '../../utils/crypto.js';
import { AppError } from '../../utils/response.js';
import { Role } from '@prisma/client';

export class BulkImportService {
  async importUsers(usersData: { name: string; email: string; role?: Role; password?: string }[]) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const [index, row] of usersData.entries()) {
      if (!row.email || !row.name) {
        results.errors.push(`Row ${index + 1}: Missing email or name.`);
        results.skipped++;
        continue;
      }

      try {
        const existing = await prisma.user.findUnique({
          where: { email: row.email.toLowerCase() },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        const password = row.password || 'Dogfood2026!';
        const passwordHash = await hashPassword(password);

        await prisma.user.create({
          data: {
            name: row.name,
            email: row.email.toLowerCase(),
            passwordHash,
            role: row.role || Role.PARTICIPANT,
          },
        });

        results.imported++;
      } catch (err: any) {
        results.errors.push(`Row ${index + 1} (${row.email}): ${err.message}`);
        results.skipped++;
      }
    }

    return results;
  }
}

export const bulkImportService = new BulkImportService();
