// File: tests/playwright/oauth/local-oauth.spec.ts
import { test, expect } from '@playwright/test'
import { env } from '../../../lib/env'

const BASE_URL = env.NEXTAUTH_URL || 'http://localhost:3000'
const CHROME_PROFILE = env.CHROME_PROFILE_PATH
const EXPECTED_USER = env.SPOTIFY_EXPECTED_USER_ID

test.describe('Local OAuth Flow', () => {
  test.skip(!!env.CI, 'Skipping OAuth local test in CI environment')

  test('should successfully authenticate with Spotify', async ({ page }) => {
    await page.goto(BASE_URL)
    // The rest of the test logic remains the same
  })
})
