// File: playwright.config.ts
/**
 * Playwright Test Configuration for HRM Comprehensive Assessment
 * Optimized for performance and parallel execution
 */
import { defineConfig, devices } from '@playwright/test'
import { getBaseURL } from './utils/urls'

// Check if Spotify/NextAuth credentials are available
const hasSpotifyCredentials = !!(
  process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
)
const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET

// Optimized ignore list - run more tests by default
const testIgnoreList = [
  // Only ignore truly integration-heavy tests for speed
  'comprehensive-assessment.spec.ts',
  'mobile-assessment.spec.ts', 
  'workflow-assessment.spec.ts',
  // OAuth tests are excluded from regular test runs (use separate npm script)
  'oauth/**/*.spec.ts',
]

// Only ignore auth-dependent tests if credentials are missing
if (!hasSpotifyCredentials) {
  testIgnoreList.push('auth-flow.spec.ts')
}
if (!hasNextAuthSecret) {
  testIgnoreList.push('debug.spec.ts')
}

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: ['**/*.spec.ts'],
  testIgnore: testIgnoreList,

  // Performance Optimizations
  fullyParallel: true, // Enable full parallelism
  workers: process.env.CI ? 2 : '50%', // Use half workers locally, 2 in CI
  retries: process.env.CI ? 2 : 1, // Retry flaky tests
  timeout: 15000, // Reduced timeout for faster feedback

  // Test execution optimizations
  expect: {
    timeout: 5000, // Faster assertion timeouts
  },
  use: {
    // Global test settings
    baseURL: getBaseURL(),
    actionTimeout: 0,
    
    // Optimized browser settings
    headless: true,
    viewport: { width: 1280, height: 720 },
    
    // Reduce overhead for faster execution
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: process.env.CI ? 'on-first-retry' : 'off',
  },

  // Browser configurations - optimized for speed
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Disable features for faster execution
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      },
    },
    // Mobile testing (optional, faster without it)
    ...(process.env.INCLUDE_MOBILE ? [{
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    }] : []),
  ],

  // Webserver configuration for auto-start
  webServer: {
    command: 'npm run build:server && npm run dev',
    port: 3000,
    timeout: 30000, // Reduced startup timeout
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output configuration
  outputDir: 'test-results/',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ...(process.env.CI ? [['github']] : []),
  ],
})

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
    baseURL: getBaseURL(),

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
