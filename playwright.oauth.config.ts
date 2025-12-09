// File: playwright.oauth.config.ts
/**
 * Playwright Test Configuration for OAuth Local Testing
 * Runs only OAuth-related tests with specific environment setup
 */
import { defineConfig, devices } from '@playwright/test'
import { getBaseURL } from './utils/urls'

export default defineConfig({
  testDir: './tests/playwright/oauth',
  testMatch: ['**/*.spec.ts'],

  // Run tests sequentially for OAuth to avoid race conditions
  fullyParallel: false,

  // No retries for local OAuth testing - fail fast for debugging
  retries: 0,

  // Single worker to prevent auth conflicts
  workers: 1,

  // Reporter configuration
  reporter: [['html', { outputFolder: 'oauth-test-report' }], ['list']],

  // Shared settings for OAuth tests
  use: {
    // Base URL for all tests
    baseURL: getBaseURL(),

    // Screenshot settings - capture all for OAuth debugging
    screenshot: 'on',

    // Video settings - always record OAuth flows for debugging
    video: 'on',

    // Trace settings - always trace OAuth for debugging
    trace: 'on',

    // Browser context options
    viewport: { width: 1920, height: 1080 },

    // Increase timeouts for OAuth flows
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },

  // Global timeout for OAuth tests
  timeout: 60_000,

  // Single chromium project optimized for OAuth testing
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          // OAuth tests run headed for debugging and session management
          headless: false,
          // Additional Chrome args for OAuth compatibility
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security', // For localhost OAuth redirects
          ],
        },
      },
    },
  ],

  // No auto-start web server - OAuth tests expect manual server management
})
