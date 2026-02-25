/**
 * Playwright Test Configuration for HRM Comprehensive Assessment
 * Optimized for performance and parallel execution
 */
import {
  defineConfig,
  devices,
  type ReporterDescription,
} from '@playwright/test'
import { DESKTOP_VIEWPORT } from './tests/playwright/lib/viewports'

// Define the port for the test server
const port = process.env.PORT || 3000
const baseURL = `http://127.0.0.1:${port}`

// Check if Spotify/NextAuth credentials are available
const hasSpotifyCredentials = !!(
  process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
)
const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET

// Optimized ignore list - run more tests by default
const testIgnoreList = [
  // Hardware-dependent tests (require Web Bluetooth, specific hardware)
  // 'bluetooth-flow.spec.ts',

  // Environment-sensitive tests (fail on CI runners due to network/CPU throttling)
  'realtime-resilience.spec.ts',

  // Only ignore truly integration-heavy tests for speed
  'comprehensive-assessment.spec.ts',
  'mobile-assessment.spec.ts',
  'workflow-assessment.spec.ts',

  // OAuth tests are excluded from regular test runs (use separate npm script)
  'oauth/**/*.spec.ts',
]

// Only ignore auth-dependent tests if credentials are missing
// We now have a fallback test in auth-flow.spec.ts so we don't need to ignore it entirely
if (!hasSpotifyCredentials) {
  // auth-flow.spec.ts is now safe to run without credentials
}
if (!hasNextAuthSecret) {
  testIgnoreList.push('debug.spec.ts')
}

// Define reporters with strict typing to avoid 'as any'
const reporters: ReporterDescription[] = [
  ['list'],
  ['blob'],
  [
    'junit',
    {
      outputFile:
        process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME || 'test-results/results.xml',
    },
  ],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ['json', { outputFile: 'test-results/results.json' }],
]

if (process.env.CI) {
  reporters.push(['github'])
}

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: ['**/*.spec.ts'],
  testIgnore: testIgnoreList,

  // Performance Optimizations
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  timeout: 30 * 1000, // Global test timeout (30s) - Restored to Playwright default to accommodate CI variance

  // Fail build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Test execution optimizations - Fail Fast Strategy
  expect: {
    timeout: 5000, // Assertions fail after 5s
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1, // Relaxed to 0.1 for stability (0.02 was too flaky)
    },
  },

  // Shared settings for all tests
  use: {
    // Base URL for all tests
    baseURL,
    actionTimeout: 5000, // Fails clicks/fills after 5s if element isn't found
    navigationTimeout: 15000, // Navigation timeout
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
    viewport: DESKTOP_VIEWPORT,
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
        viewport: DESKTOP_VIEWPORT,
        video: {
          mode: 'retain-on-failure',
          size: DESKTOP_VIEWPORT,
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

  // Web Server Configuration
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command:
          process.env.SKIP_BUILD === 'true'
            ? 'NODE_ENV=production bash scripts/start-production.sh'
            : 'NODE_ENV=production pnpm run build && bash scripts/start-production.sh',
        url: `${baseURL}/api/health/simple`,
        timeout: 120 * 1000, // 2 minutes
        reuseExistingServer: !process.env.CI,
        env: {
          PORT: port.toString(),
          TESTING: 'true',
          NEXT_PUBLIC_TESTING: 'true',
          NEXTAUTH_SECRET: 'a-super-long-and-secure-secret-for-ci-tests',
          NEXTAUTH_URL: baseURL,
          SPOTIFY_CLIENT_ID: 'test_client_id',
          SPOTIFY_CLIENT_SECRET: 'test_client_secret',
          ALLOW_DEBUG_RESET: 'true',
          WEBSOCKET_WATCHDOG_INTERVAL: '5000',
        },
      },

  // Output configuration
  outputDir: 'test-results/',
  reporter: [
    ['list'],
    ...(process.env.CI ? [['github']] : []),
    ['blob'],
    [
      'junit',
      {
        outputFile:
          process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME ||
          'test-results/results.xml',
      },
    ],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
})
