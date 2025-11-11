import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for LOCAL Development Testing
 *
 * This config uses localhost URLs for all services.
 * Use this when running the full suite locally.
 *
 * To use: npx playwright test --config=playwright.config.local.js
 */

export default defineConfig({
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: false, // Disabled for integration tests that may share state

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 1, // Single worker for integration tests

  // Reporter to use
  reporter: [
    ['html'],
    ['list']
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:5174', // Portal as default

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Local service URLs for integration tests
  env: {
    // Frontend Services
    PORTAL_URL: 'http://localhost:5174',
    BILLING_URL: 'http://localhost:5173',
    OPERATIONS_URL: 'http://localhost:5176',
    DASHBOARD_URL: 'http://localhost:8080',
    ESTIMATOR_URL: 'http://localhost:5175',
    INVENTORY_URL: 'http://localhost:5177',
    BOOKING_URL: 'http://localhost:5178',
    SITE_URL: 'http://localhost:5179',
    MARKETING_URL: 'http://localhost:5180',

    // Backend Services
    BOOKING_API_URL: 'http://localhost:3001',
    VIDEO_URL: 'http://localhost:5000',

    // Infrastructure
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_STUDIO_URL: 'http://localhost:54323',
  },

  // Web Server configuration for starting services before tests
  webServer: {
    command: 'npm run dev:core',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for services to start
  },
});
