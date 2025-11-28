/**
 * Playwright Test Configuration for HRM Application
 * Optimized for performance and parallel execution with a consolidated test suite.
 */
import { defineConfig, devices } from '@playwright/test'
import { getBaseURL } from './utils/urls'

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: ['**/*.spec.ts'],
  // Ignore tests that are not part of the core automated suite.
  testIgnore: ['**/oauth/**', '**/infrastructure.spec.ts'],

  // Performance Optimizations
  fullyParallel: true,
  // Let Playwright decide the number of workers based on available resources.
  workers: process.env.CI ? 2 : undefined,
  timeout: 60000, // Increased timeout for CI

  // Fail build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Test execution optimizations
  expect: {
    timeout: 10000, // Increased expect timeout
  },

  // Shared settings for all tests
  use: {
    baseURL: getBaseURL(),
    actionTimeout: 0,
    headless: true,
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    video: {
      mode: 'retain-on-failure',
      size: { width: 1920, height: 1080 },
    },
    trace: 'on-first-retry',
    viewport: { width: 1920, height: 1080 },
  },

  // Browser configurations
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Output configuration
  outputDir: 'test-results/',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github']] : []),
  ],
})
