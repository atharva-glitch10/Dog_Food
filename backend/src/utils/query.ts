import { z } from 'zod';

/**
 * Query-string helpers. Express gives us `string | string[] | ParsedQs | undefined`
 * for every key, so junk input (`?page=abc`, `?search=a&search=b`) must never
 * reach arithmetic or Prisma unchecked. Invalid values fall back to defaults
 * instead of producing NaN or a 500.
 */

/** Takes the first value when a key is repeated (?page=1&page=2). */
const firstValue = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export function intParam(defaultValue: number, min: number, max: number) {
  return z.preprocess(
    firstValue,
    z.coerce
      .number()
      .finite()
      .int()
      .catch(defaultValue)
      .transform((n) => Math.min(max, Math.max(min, n)))
  );
}

export function optionalStringParam(maxLength: number) {
  return z.preprocess(
    firstValue,
    z
      .string()
      .trim()
      .max(maxLength)
      .transform((s) => (s.length ? s : undefined))
      .optional()
      .catch(undefined)
  );
}

export function optionalEnumParam<T extends [string, ...string[]]>(values: T) {
  return z.preprocess(firstValue, z.enum(values).optional().catch(undefined));
}

export function paginationSchema(defaultLimit: number, maxLimit: number) {
  return z.object({
    page: intParam(1, 1, 100_000),
    limit: intParam(defaultLimit, 1, maxLimit),
  });
}
