import { execSync } from 'child_process';
import path from 'path';

/**
 * Integration test database bootstrap.
 *
 * Uses DATABASE_URL (default: the docker-compose.test.yml database on port 5433).
 * Because it DROPS AND RECREATES the schema, it refuses to run unless the
 * database name ends in "_test".
 */
export const DEFAULT_TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/dogfood_test?schema=public';

export default function setup() {
  const url = process.env.DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
  process.env.DATABASE_URL = url;

  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against database "${dbName}": the name must end in "_test" ` +
        `because the schema is reset on every run.`
    );
  }

  const cwd = path.resolve(__dirname, '../..');
  const env = { ...process.env, DATABASE_URL: url, SEED_DEMO_DATA: 'true' };
  const run = (cmd: string) => execSync(cmd, { cwd, env, stdio: 'pipe' });

  try {
    run('npx prisma migrate reset --force --skip-seed --skip-generate');
  } catch (err: any) {
    const output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    throw new Error(
      `Could not reset the integration test database at ${url.replace(/:[^:@/]+@/, ':***@')}.\n` +
        `Start one with: docker compose -f docker-compose.test.yml up -d\n\n${output}`
    );
  }
  run('npx tsx src/seed/demo-seed.ts');
}
