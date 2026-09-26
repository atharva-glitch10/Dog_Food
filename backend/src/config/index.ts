import dotenv from 'dotenv';
dotenv.config();

// ---------------------------------------------------------------------------
// Crash-early guard: required secrets must be explicitly set in production.
// This prevents the app from starting with public fallback credentials.
// ---------------------------------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';

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
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/dogfood?schema=public',
};
