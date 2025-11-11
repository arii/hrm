// File: playwright.config.ts
/**
 * Playwright Test Configuration for HRM Visual Regression Tests
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/playwright',

  // Run tests in parallel
  fullyParallel: false,

  // Fail build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Use 1 worker for visual tests to avoid server race conditions
  workers: 1,

  // Reporter configuration
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // Shared settings for all tests
  use: {
    // Base URL for all tests
    baseURL:
      process.env.BASE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://127.0.0.1:3000',

    // Screenshot settings
    screenshot: 'only-on-failure',

    // Video settings
    video: 'retain-on-failure',

    // Trace settings
    trace: 'on-first-retry',

    // Browser context options
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration (start dev server before tests)
  webServer: {
    command: 'npm run dev:clean',
    url:
      process.env.BASE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
