import { defineConfig } from 'vitest/config';

// `npm run test:integration`: runs against a real PostgreSQL database.
// The global setup refuses to run unless the database name ends in "_test",
// then resets it (migrate reset + demo seed) so every run starts clean.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/integration/global-setup.ts'],
    // Suites share one database; run files sequentially.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
