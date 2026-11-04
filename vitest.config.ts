import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.ts', 'apps/api/tests/**/*.test.ts', 'apps/web/tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
