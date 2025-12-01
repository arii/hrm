/**
 * Playwright Test Configuration for HRM Comprehensive Assessment
 * Optimized for performance and parallel execution
 */
import { defineConfig, devices } from '@playwright/test';
import { getBaseURL } from './utils/urls';

// Check if Spotify/NextAuth credentials are available
const hasSpotifyCredentials = !!(
  process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
);
const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;

// Optimized ignore list - run more tests by default
const testIgnoreList = [
  // Only ignore truly integration-heavy tests for speed
  'comprehensive-assessment.spec.ts',
  'mobile-assessment.spec.ts',
  'workflow-assessment.spec.ts',
  // OAuth tests are excluded from regular test runs (use separate npm script)
  'oauth/**/*.spec.ts',
];

// Only ignore auth-dependent tests if credentials are missing
if (!hasSpotifyCredentials) {
  testIgnoreList.push('auth-flow.spec.ts');
}
if (!hasNextAuthSecret) {
  testIgnoreList.push('debug.spec.ts');
}

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: ['**/*.spec.ts'],
  testIgnore: testIgnoreList,

  // Performance Optimizations
  // Disabled parallelism because tests interact with a singleton server state (Timer, Spotify)
  fullyParallel: false,
  workers: 1,
  timeout: 5 * 1000, // Global test timeout reduced to 5s

  // Fail build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Test execution optimizations - Fail Fast Strategy
  expect: {
    timeout: 5000, // Assertions fail after 5s
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1,
    },
  },

  // Shared settings for all tests
  use: {
    // Base URL for all tests
    baseURL: getBaseURL(),
    actionTimeout: 3000, // Fails clicks/fills after 3s if element isn't found
    navigationTimeout: 3000, // Navigation timeout reduced
    headless: true,

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

  // Browser configurations
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            // Hide scrollbars for consistent VRT snapshots
            '--hide-scrollbars',
          ],
        },
        viewport: { width: 1920, height: 1080 },
        video: {
          mode: 'retain-on-failure',
          size: { width: 1920, height: 1080 },
        },
      },
    },
    // Mobile testing (optional, can be enabled via environment variable)
    ...(process.env.INCLUDE_MOBILE
      ? [
          {
            name: 'Mobile Chrome',
            use: {
              ...devices['Pixel 5'],
              // Ensure consistent viewport for mobile VRT
              viewport: devices['Pixel 5'].viewport,
            },
          },
        ]
      : []),
  ],



  // Output configuration
  outputDir: 'test-results/',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github']] : []),
  ],
});