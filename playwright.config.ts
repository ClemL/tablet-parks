import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;
const UPSTASH_PORT = 3299;

/**
 * Browser tests against the production build.
 *
 * Nothing here talks to the real Upstash. `scripts/mock-upstash.mjs` answers
 * `POST /start-redis` the way Upstash does — a markdown page with an endpoint
 * and a token — and serves that endpoint's REST API in front of a real
 * `redis-server`, so every game in these tests provisions its own database,
 * and the compare-and-set Lua runs for real. Run `npm run build` first.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `node scripts/mock-upstash.mjs --port ${UPSTASH_PORT}`,
      url: `http://127.0.0.1:${UPSTASH_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `npm run start -- -p ${PORT}`,
      url: `http://localhost:${PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        UPSTASH_START_REDIS_URL: `http://127.0.0.1:${UPSTASH_PORT}/start-redis`,
        PARKS_STORE: 'start-redis',
        // Every test opens a table from the same address; a real table opens one.
        PARKS_RATE_LIMIT: '50',
        TABLE_SECRET: 'e2e-only-secret-not-for-production-use-0123456789',
      },
    },
  ],
});
