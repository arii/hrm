import { expect, test } from '@playwright/test'
import { getBaseURL, API_PREFIX } from '../../utils/urls'

const BASE = getBaseURL()

test.describe('Spotify Authentication', () => {
  test('auth check endpoint responds', async ({ request }) => {
    const res = await request.get(`${BASE}${API_PREFIX}debug/auth-check`)
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
})
