// File: playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { env } from './lib/env'

// Use a dynamic base URL from an environment variable or default to localhost
const baseURL = env.NEXTAUTH_URL || 'http://localhost:3000'

// Conditionally skip certain tests if required secrets are not present
const hasSpotifyCredentials = !!(
  env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET
)
const hasNextAuthSecret = !!env.NEXTAUTH_SECRET

const config = defineConfig({
  testDir: './tests/playwright',
  outputDir: './tests/playwright/test-results',
  fullyParallel: true,
  workers: 1, // env.CI ? 2 : undefined, // Use available CPU cores locally, 2 on CI
  forbidOnly: !!env.CI,
  retries: env.CI ? 2 : 0,
  reporter: env.CI ? 'github' : 'list',

  // Shared settings for all projects
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Custom viewport to match common screen sizes
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add mobile configuration if the INCLUDE_MOBILE env var is set
    ...(env.INCLUDE_MOBILE
      ? [
          {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
          },
        ]
      : []),
  ],

  // Skip certain test suites based on missing credentials
  testIgnore: [
    ...(!hasNextAuthSecret ? ['**/infrastructure.spec.ts'] : []),
    ...(!hasSpotifyCredentials ? ['**/auth-flow.spec.ts'] : []),
  ],
})

export default config
