import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    // Integration tests require a real DATABASE_URL; skip if not set.
    // Use: DATABASE_URL=postgresql://... pnpm test:integration
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
