import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.bench.ts', '**/e2e-ui/**'],
    hookTimeout: 60_000,
  },
});
