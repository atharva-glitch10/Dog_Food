import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../../utils/prisma.js';
import { hashPassword } from '../../utils/crypto.js';
import { Role } from '@prisma/client';

// Each created user costs one bcrypt hash (~0.2s), so keep requests well under proxy timeouts.
export const MAX_IMPORT_ROWS = 200;

/** Roles an importer may assign. ADMIN can never be created through bulk import. */
export function importableRoles(importerRole: Role | undefined): Role[] {
  return importerRole === Role.ADMIN
    ? [Role.PARTICIPANT, Role.JUDGE, Role.ORGANIZER]
    : [Role.PARTICIPANT, Role.JUDGE];
}

const RowSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  role: z.nativeEnum(Role).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
});

export interface ImportRowResult {
  row: number;
  email: string;
  status: 'valid' | 'imported' | 'skipped' | 'error';
  errors: string[];
  /** Only present for rows imported without a password: a one-time random password. */
  temporaryPassword?: string;
}

export interface ImportResult {
  dryRun: boolean;
  imported: number;
  skipped: number;
  /** Flat, human-readable error list (kept for API compatibility). */
  errors: string[];
  rows: ImportRowResult[];
}

function randomPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

export class BulkImportService {
  /**
   * Validate and (unless dryRun) create users. Rows are validated individually;
   * existing emails and duplicate emails within the file are skipped, never updated.
   */
  async importUsers(
    usersData: unknown,
    options: { dryRun?: boolean; importerRole?: Role } = {}
  ): Promise<ImportResult> {
    const dryRun = options.dryRun === true;
    const allowedRoles = importableRoles(options.importerRole);
    const result: ImportResult = { dryRun, imported: 0, skipped: 0, errors: [], rows: [] };

    if (!Array.isArray(usersData)) {
      result.errors.push('Request body must contain a "users" array.');
      return result;
    }
    if (usersData.length > MAX_IMPORT_ROWS) {
      result.errors.push(`Too many rows (${usersData.length}); the maximum is ${MAX_IMPORT_ROWS}.`);
      return result;
    }

    const seenInFile = new Set<string>();

    for (const [index, raw] of usersData.entries()) {
      const rowNumber = index + 1;
      const rawEmail = typeof (raw as any)?.email === 'string' ? (raw as any).email : '';
      const parsed = RowSchema.safeParse(raw);

      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => i.message);
        result.rows.push({ row: rowNumber, email: rawEmail, status: 'error', errors });
        result.errors.push(`Row ${rowNumber}: ${errors.join('; ')}`);
        result.skipped++;
        continue;
      }

      const row = parsed.data;
      const role = row.role ?? Role.PARTICIPANT;
      if (!allowedRoles.includes(role)) {
        const msg = `Role ${role} cannot be assigned via bulk import.`;
        result.rows.push({ row: rowNumber, email: row.email, status: 'error', errors: [msg] });
        result.errors.push(`Row ${rowNumber}: ${msg}`);
        result.skipped++;
        continue;
      }

      if (seenInFile.has(row.email)) {
        result.rows.push({ row: rowNumber, email: row.email, status: 'skipped', errors: ['Duplicate email in file.'] });
        result.skipped++;
        continue;
      }
      seenInFile.add(row.email);

      try {
        const existing = await prisma.user.findUnique({ where: { email: row.email }, select: { id: true } });
        if (existing) {
          result.rows.push({ row: rowNumber, email: row.email, status: 'skipped', errors: ['A user with this email already exists.'] });
          result.skipped++;
          continue;
        }

        if (dryRun) {
          result.rows.push({ row: rowNumber, email: row.email, status: 'valid', errors: [] });
          continue;
        }

        const temporaryPassword = row.password ? undefined : randomPassword();
        const passwordHash = await hashPassword(row.password ?? temporaryPassword!);
        await prisma.user.create({
          data: { name: row.name, email: row.email, passwordHash, role },
        });

        result.rows.push({ row: rowNumber, email: row.email, status: 'imported', errors: [], temporaryPassword });
        result.imported++;
      } catch (err: any) {
        const msg = err?.code === 'P2002' ? 'A user with this email already exists.' : 'Could not create user.';
        result.rows.push({ row: rowNumber, email: row.email, status: 'error', errors: [msg] });
        result.errors.push(`Row ${rowNumber} (${row.email}): ${msg}`);
        result.skipped++;
      }
    }

    return result;
  }
}

export const bulkImportService = new BulkImportService();
