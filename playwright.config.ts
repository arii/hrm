/**
 * Playwright Test Configuration for HRM Assessment
 * Optimized for performance and parallel execution based on the test improvement plan.
 */
import { defineConfig, devices } from '@playwright/test';
import { getBaseURL } from './utils/urls';

// Check if Spotify/NextAuth credentials are available
const hasSpotifyCredentials = !!(
  process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
);
const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;

const testIgnoreList = [
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
  fullyParallel: true,
  workers: 2, // Enable parallel execution
  timeout: 30000,

  // Fail build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Test execution optimizations
  expect: {
    timeout: 5000,
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
  },

  // Browser configurations
  projects: [
    {
      name: 'core-tests',
      testMatch: /core-functionality\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'mobile-tests',
      testMatch: /mobile-essential\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'integration-tests',
      testMatch: /integration-tests\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
        viewport: { width: 1920, height: 1080 },
      },
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
});
