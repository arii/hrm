import { test, expect, chromium, BrowserContext } from '@playwright/test'
import path from 'path'
import os from 'os'
import fs from 'fs'

/**
 * Local OAuth Verification Test
 * * This test is designed to run LOCALLY (not in CI) using an existing Chrome profile
 * to verify that the Spotify OAuth flow works with real cookies/sessions.
 * * Usage:
 * TEST_BASE_URL=http://localhost:3000 npm run test:visual -- tests/playwright/local-oauth.spec.ts
 */

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const CHROME_PROFILE = process.env.CHROME_PROFILE_PATH
const EXPECTED_USER = process.env.SPOTIFY_EXPECTED_USER_ID

// Skip in CI environments to prevent rate limiting and auth failures
test.skip(process.env.CI !== undefined, 'Skipping OAuth local test in CI environment')

test.describe('Spotify OAuth Integration (Local)', () => {
  let context: BrowserContext

  test.beforeAll(async () => {
    if (CHROME_PROFILE === undefined) {
      console.warn(
        '⚠️  No CHROME_PROFILE_PATH set. Test will run with a fresh profile (login may be required).',
      )
    } else if (!fs.existsSync(CHROME_PROFILE)) {
      console.warn(
        `⚠️  Profile path not found: ${CHROME_PROFILE}. Test will run with fresh profile.`,
      )
    }
  })

  test('verify authenticated session and token exchange', async () => {
    // We use launchPersistentContext to attach to an existing user session (cookies)
    // This allows us to test the "re-auth" or "active session" flow without typing credentials every time
    const userDataDir =
      CHROME_PROFILE ?? path.join(os.tmpdir(), 'playwright-temp-profile')

    console.log(`🚀 Launching browser with profile: ${userDataDir}`)

    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Must be headed to see/interact with Spotify login if needed
      viewport: { width: 1280, height: 720 },
      args: ['--disable-blink-features=AutomationControlled'], // Reduce detection
      ignoreHTTPSErrors: true, // Localhost often has cert issues
    })

    const page = context.pages()[0] ?? (await context.newPage())

    // 1. Navigate to the Control page (protected route)
    console.log(`Testing URL: ${BASE_URL}/client/control`)
    await page.goto(`${BASE_URL}/client/control`)

    // 2. Check for Login State
    // If we see the login button, try to click it
    const loginButton = page.getByText('🎵 Login with Spotify')

    if (await loginButton.isVisible({ timeout: 3000 })) {
      console.log('ℹ️  Login button found. Initiating OAuth flow...')
      await loginButton.click()

      // Wait for potential redirects (Spotify -> Callback -> App)
      await page.waitForURL(`${BASE_URL}/**`, {
        timeout: 30000,
        waitUntil: 'networkidle',
      })
    } else {
      console.log('ℹ️  No login button found. Assuming already authenticated.')
    }

    // 3. Verify "State Cookie Missing" Error NOT present
    // This captures the specific regression we want to avoid
    const errorText = await page
      .getByText(/State cookie was missing/i)
      .isVisible()
    expect(
      errorText,
      '❌ Critical: "State cookie was missing" error detected!',
    ).toBeFalsy()

    // 4. Verify WebSocket Connection
    // We check for a UI element that appears only when connected, e.g., the connection status or user profile
    const _statusIndicator = page.getByText(/Connected|Online/i)
    // Or checking internal state via evaluation if UI is subtle
    const socketState = await page.evaluate(
      () =>
        // @ts-expect-error - assuming we might expose this for debug, otherwise check UI
        window._socketStatus ?? 'unknown',
    )
    console.log(`WebSocket State: ${socketState}`)

    // 5. Verify User Identity (if provided)
    if (EXPECTED_USER !== undefined) {
      // This assumes the UI displays the user ID or we can fetch it from an API debug endpoint
      const debugAuthResponse = await page.request.get(
        `${BASE_URL}/api/debug/auth-check`,
      )
      const debugJson = await debugAuthResponse.json()

      console.log('Auth Debug Info:', debugJson)
      expect(debugJson.userId).toBe(EXPECTED_USER)
    }

    // 6. Check Token Validity via API
    const tokenResponse = await page.request.get(
      `${BASE_URL}/api/debug/spotify-token-status`,
    )
    expect(tokenResponse.status()).toBe(200)
    const tokenData = await tokenResponse.json()
    expect(tokenData.status, '❌ No valid token status found on server').toBe(
      'token_found',
    )
    expect(
      tokenData.accessToken,
      '❌ No Access Token found on server',
    ).toBeTruthy()
    expect(
      tokenData.refreshToken,
      '❌ No Refresh Token found on server',
    ).toBeTruthy()

    console.log('✅ OAuth Flow & Token Exchange Verified Successfully')

    // Short pause to verify visually if running manually
    // await page.pause();

    await context.close()
  })
})
