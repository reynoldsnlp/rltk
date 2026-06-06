const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Each worker runs its own persistent Chrome context that loads ~570MB of
  // WASM models, so the bottleneck is memory, not CPU. With tests no longer
  // pinned serial, the default (~half the cores) over-subscribes and a context
  // can crash mid-run ("Target page/context/browser has been closed"). Cap
  // local parallelism at 4 — measured as both stable and fastest here. CI runs
  // single-worker.
  workers: process.env.CI ? 1 : 4,
  // Headed Chromium loading ~570MB of WASM models analyzes much slower on the
  // single-worker CI runner than locally. The 30s Playwright default is too
  // tight for reading-tutor analysis tests there; 60s is the floor. Individual
  // tests still raise this further with test.setTimeout() as needed.
  timeout: 60000,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    baseURL: 'http://127.0.0.1:19876',
  },
  webServer: {
    command: 'node tests/e2e/server.js',
    port: 19876,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
