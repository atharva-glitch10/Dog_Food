/**
 * Phase 10 Regression Tests — Production Secret Validation
 */
import { describe, it, expect } from 'vitest';
import { validateSecret, KNOWN_INSECURE_SECRETS } from '../../src/config/index.js';

const KNOWN_BAD_SECRETS = [
  'dogfood-insecure-secret-key-change-in-prod-2026',
  'dogfood-cookie-secret-2026',
  'dogfood-offline-secret-key-2026',
  'secret',
  'changeme',
  'password',
  // Former docker-compose / .env.example fallbacks
  'd09f00d2026_jwt_secret_offline_eval_secure_key_32chars_min',
  'd09f00d2026_cookie_secret_offline_eval_secure_key_32chars',
  'd09f00d2026_cookie_secret_offline_eval_secure_key_32chars_min',
];

const GOOD_SECRET = 'a'.repeat(32); // 32-char secret that is not on the blocklist

/** Same signature as before, now delegating to the real validator in src/config. */
function simulateRequireSecret(
  envValue: string | undefined,
  fallback: string,
  isProd: boolean,
  knownBad: ReadonlySet<string>
): string {
  return validateSecret('TEST_SECRET', envValue, fallback, isProd, knownBad);
}

describe('Production Secret Validation', () => {
  // The product's real blocklist
  const knownBad = KNOWN_INSECURE_SECRETS;

  it('blocklist contains every known placeholder, including the old compose fallbacks', () => {
    for (const bad of KNOWN_BAD_SECRETS) expect(knownBad.has(bad)).toBe(true);
  });


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
