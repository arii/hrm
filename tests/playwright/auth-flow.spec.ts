import { expect, test } from '@playwright/test'

import { getBaseURL } from '../../utils/urls'

const BASE = getBaseURL()

test.describe('Spotify Authentication', () => {
  test('auth check endpoint responds', async ({ request }) => {
    const res = await request.get(`${BASE}/api/debug/auth-check`)
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    // Verify properties reflect the environment state, or at least are boolean
    expect(typeof data.spotifyConfigured).toBe('boolean')
    expect(typeof data.nextAuthConfigured).toBe('boolean')
    expect(typeof data.hasClientSecret).toBe('boolean')

    // Stronger checks matching server environment (if env vars are passed to test runner)
    if (process.env.SPOTIFY_CLIENT_ID) {
      expect(data.spotifyConfigured).toBe(true)
    } else {
      expect(data.spotifyConfigured).toBe(false)
    }

    if (process.env.NEXTAUTH_SECRET) {
      expect(data.nextAuthConfigured).toBe(true)
    } else {
      expect(data.nextAuthConfigured).toBe(false)
    }

    if (process.env.SPOTIFY_CLIENT_SECRET) {
      expect(data.hasClientSecret).toBe(true)
    } else {
      expect(data.hasClientSecret).toBe(false)
    }
  })

  test('debug page shows auth components', async ({ page }) => {
    await page.goto(`${BASE}/debug/spotify`)
    await expect(page.getByText(/sign in/i)).toBeVisible()
    await expect(page.getByText(/server token status/i)).toBeVisible()
  })

  test('should show fallback UI if auth credentials missing', async ({
    page,
  }) => {
    // This test ensures we handle the "no credentials" case gracefully
    // We expect the login button to be visible on the dashboard
    await page.goto(BASE)
    // The text might be "Login with Spotify" or similar. Using case-insensitive regex.
    await expect(page.getByText(/login with spotify/i)).toBeVisible()
  })
})
