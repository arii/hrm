// playwright.storybook.config.ts
import { defineConfig, devices } from '@playwright/test'
import path from 'path'

// Use process.env.PORT by default and fallback to 6006
const PORT = process.env.PORT || 6006

// Set web server url for Playwright
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  // Look for test files in the "tests/storybook" directory.
  testDir: 'tests/storybook',
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: 'html',
  // The output directory for files created during test execution
  outputDir: 'storybook-test-results/',

  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL,
    // Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
    trace: 'on-first-retry',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run storybook',
    url: baseURL,
    timeout: 300 * 1000,
    reuseExistingServer: !process.env.CI,
  },
})
