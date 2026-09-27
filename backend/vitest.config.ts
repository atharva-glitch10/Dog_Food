import { defineConfig } from 'vitest/config';

// `npm test`: fast, database-free suites (pure engines, mocked-Prisma security
// tests, and HTTP tests that never reach the database).
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/security/**/*.test.ts', 'tests/api/**/*.test.ts'],
    environment: 'node',
  },
});
