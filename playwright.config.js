import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Sailorskills Suite Integration Tests
 *
 * These tests verify cross-service integration flows:
 * - Estimator → Operations (order creation → service delivery)
 * - Billing → Portal (invoice creation → customer visibility)
 * - Operations → Dashboard (service completion → analytics)
 * - Inventory → Operations (packing lists, stock)
 */

export default defineConfig({
  testDir: './tests',

  // Run tests in serial (one at a time) to avoid race conditions in shared database
  fullyParallel: false,
  workers: 1,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter
  reporter: process.env.CI ? 'github' : 'html',

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'https://sailorskills.com',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Timeout for each action (e.g., click, fill)
    actionTimeout: 15000,
  },

  // Global timeout for each test
  timeout: 120000, // 2 minutes (integration tests may be slow)

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run your local dev server before starting the tests (optional)
  // webServer: {
  //   command: 'npm run dev',
  //   port: 5173,
  //   reuseExistingServer: !process.env.CI,
  // },
});
