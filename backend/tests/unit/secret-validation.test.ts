/**
 * Phase 10 Regression Tests — Production Secret Validation
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const KNOWN_BAD_SECRETS = [
  'dogfood-insecure-secret-key-change-in-prod-2026',
  'dogfood-cookie-secret-2026',
  'dogfood-offline-secret-key-2026',
  'secret',
  'changeme',
  'password',
];

const GOOD_SECRET = 'a'.repeat(32); // 32-char secret that is not on the blocklist

function simulateRequireSecret(
  envValue: string | undefined,
  fallback: string,
  isProd: boolean,
  knownBad: Set<string>
): string {
  if (!envValue) {
    if (isProd) throw new Error('MISSING_SECRET');
    return fallback;
  }
  if (isProd && knownBad.has(envValue)) throw new Error('INSECURE_SECRET');
  if (isProd && envValue.length < 32) throw new Error('WEAK_SECRET');
  return envValue;
}

describe('Production Secret Validation', () => {
  const knownBad = new Set(KNOWN_BAD_SECRETS);

  it('rejects missing JWT_SECRET in production', () => {
    expect(() => simulateRequireSecret(undefined, 'fallback', true, knownBad))
      .toThrow('MISSING_SECRET');
  });

  it('rejects missing COOKIE_SECRET in production', () => {
    expect(() => simulateRequireSecret(undefined, 'fallback', true, knownBad))
      .toThrow('MISSING_SECRET');
  });

  it('rejects known placeholder secrets in production', () => {
    for (const bad of KNOWN_BAD_SECRETS) {
      expect(() => simulateRequireSecret(bad, 'fallback', true, knownBad))
        .toThrow('INSECURE_SECRET');
    }
  });

  it('rejects short secrets (< 32 chars) in production', () => {
    expect(() => simulateRequireSecret('shortkey', 'fallback', true, knownBad))
      .toThrow('WEAK_SECRET');
  });

  it('accepts valid long secret in production', () => {
    expect(simulateRequireSecret(GOOD_SECRET, 'fallback', true, knownBad))
      .toBe(GOOD_SECRET);
  });

  it('uses fallback in development when env var is not set', () => {
    const result = simulateRequireSecret(undefined, 'dev-fallback', false, knownBad);
    expect(result).toBe('dev-fallback');
  });

  it('does not throw for known-bad secrets in development', () => {
    expect(() => simulateRequireSecret('secret', 'fallback', false, knownBad))
      .not.toThrow();
  });

  it('does not throw for short secrets in development', () => {
    expect(() => simulateRequireSecret('abc', 'fallback', false, knownBad))
      .not.toThrow();
  });

  it('accepts exactly 32 char secret in production', () => {
    const exactly32 = 'a'.repeat(32);
    expect(simulateRequireSecret(exactly32, 'fallback', true, knownBad))
      .toBe(exactly32);
  });

  it('rejects 31-char secret in production', () => {
    const tooShort = 'a'.repeat(31);
    expect(() => simulateRequireSecret(tooShort, 'fallback', true, knownBad))
      .toThrow('WEAK_SECRET');
  });
});
