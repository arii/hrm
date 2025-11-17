// File: playwright.config.ts
/**
 * Playwright Test Configuration for HRM Comprehensive Assessment
 * Supports visual regression, mobile testing, and video recording
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: ['**/*.spec.ts'],
  testIgnore: [
    'integration-tests.spec.ts',
    'comprehensive-assessment.spec.ts',
    'core-functionality.spec.ts',
    'mobile-essential.spec.ts',
    'mobile-assessment.spec.ts',
    'workflow-assessment.spec.ts',
  ],

  // Run tests in parallel
  fullyParallel: false,

  // Fail build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Use 1 worker for visual tests to avoid server race conditions
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for all tests
    baseURL:
      process.env.BASE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://127.0.0.1:3000',

    // Screenshot settings
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },

    // Video settings
    video: {
      mode: 'retain-on-failure',
      size: { width: 1920, height: 1080 },
    },

    // Trace settings
    trace: 'on-first-retry',

    // Browser context options
    viewport: { width: 1920, height: 1080 },
  },

  // Single chromium project for fast testing
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        video: {
          mode: 'retain-on-failure',
          size: { width: 1920, height: 1080 },
        },
      },
    },
  ],

  // Web server configuration disabled - start server manually
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
})
