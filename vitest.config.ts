import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.bench.ts'],
    hookTimeout: 60_000,
  },
});
