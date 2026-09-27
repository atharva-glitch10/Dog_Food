import dotenv from 'dotenv';
dotenv.config();

// ---------------------------------------------------------------------------
// Crash-early guard: required secrets must be explicitly set in production.
// Known-bad placeholder values are explicitly rejected in production.
// ---------------------------------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';

// Secrets that must NEVER be used in production
const KNOWN_INSECURE_SECRETS = new Set([
  'dogfood-insecure-secret-key-change-in-prod-2026',
  'dogfood-cookie-secret-2026',
  'dogfood-offline-secret-key-2026',  // old docker-compose fallback
  // Former docker-compose / .env.example fallbacks (publicly known, never valid)
  'd09f00d2026_jwt_secret_offline_eval_secure_key_32chars_min',
  'd09f00d2026_cookie_secret_offline_eval_secure_key_32chars',
  'd09f00d2026_cookie_secret_offline_eval_secure_key_32chars_min',
  'secret',
  'changeme',
  'password',
  'dev',
  'development',
]);

function requireSecret(envKey: string, fallback: string): string {
  const value = process.env[envKey];

  if (!value) {
    if (isProd) {
      throw new Error(
        `FATAL: Required environment variable "${envKey}" is not set. ` +
          `The application cannot start in production without explicit secrets.`
      );
    }
    console.warn(
      `[CONFIG] WARNING: "${envKey}" is not set. Using insecure development default. ` +
        `Set this variable before deploying to production.`
    );
    return fallback;
  }

  if (isProd && KNOWN_INSECURE_SECRETS.has(value)) {
    throw new Error(
      `FATAL: "${envKey}" contains a known insecure placeholder value. ` +
        `Generate a strong random secret before deploying to production. ` +
        `Use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  if (isProd && value.length < 32) {
    throw new Error(
      `FATAL: "${envKey}" is too short (${value.length} chars). ` +
        `Production secrets must be at least 32 characters.`
    );
  }

  return value;
}

/**
 * Express "trust proxy" setting. Unset/"false" disables it (direct connections).
 * A number trusts that many hops; any other value is passed through as a
 * comma-separated list of addresses/subnets or presets such as
 * "loopback, linklocal, uniquelocal".
 */
function parseTrustProxy(raw: string | undefined): boolean | number | string {
  const value = (raw ?? '').trim();
  if (!value || value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: requireSecret('JWT_SECRET', 'dogfood-insecure-secret-key-change-in-prod-2026'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'dogfood_session',
  cookieSecret: requireSecret('COOKIE_SECRET', 'dogfood-cookie-secret-2026'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  /** Session cookie Secure flag: "auto" (follow request protocol), "true" or "false". */
  cookieSecure: (process.env.COOKIE_SECURE || 'auto').toLowerCase(),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/dogfood?schema=public',
};
