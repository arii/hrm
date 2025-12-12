import { expect, test } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'

const BASE = getBaseURL()

test.describe('Spotify Authentication', () => {
  test('auth check endpoint responds', async ({ request }) => {
    const res = await request.get(`${BASE}/api/debug/auth-check`)
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    expect(data).toHaveProperty('spotifyConfigured', true)
    expect(data).toHaveProperty('nextAuthConfigured', true)
    expect(data).toHaveProperty('hasClientSecret', true)
  })

  test('debug page shows auth components', async ({ page }) => {
    await page.goto(`${BASE}/debug/spotify`)
    await expect(page.getByText(/sign in/i)).toBeVisible()
    await expect(page.getByText(/server token status/i)).toBeVisible()
  })

  test('login button redirects to Spotify with correct scopes', async ({
    page,
  }) => {
    await page.goto(`${BASE}/debug/spotify`)
    // The button is not a link (<a>), it's a <button> that triggers signIn()
    const loginButton = page.getByRole('button', { name: /sign in/i })
    await expect(loginButton).toBeVisible()

    // Since next-auth signIn handles the redirect client-side, we intercept the navigation
    // or request to Spotify.
    const [request] = await Promise.all([
      page.waitForRequest((req) =>
        req.url().includes('accounts.spotify.com/authorize')
      ),
      loginButton.click(),
    ])

    const url = request.url()
    expect(url).toContain('accounts.spotify.com/authorize')
    expect(url).toContain('scope=')
    expect(url).toContain('response_type=code')
    // Verify critical scopes
    expect(url).toContain('user-read-playback-state')
    expect(url).toContain('user-modify-playback-state')
  })
})
