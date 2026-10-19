import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 60000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside a React Server Component; the server
      // modules are unit tested directly, so it is stubbed here.
      'server-only': fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)),
    },
  },
});
