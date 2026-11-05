import { defineConfig } from 'vitest/config';
export default defineConfig({
  root: 'frontend',
  base: './',
  build: { outDir: '../dist', emptyOutDir: true },
  test: { include: ['../tests/**/*.test.ts'], environment: 'node' },
});
