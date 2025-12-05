import { expect, test, type Page } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'

const BASE = getBaseURL()

test.describe('Spotify Debug UI', () => {
  test('debug page loads and shows signin option', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto(`${BASE}/debug/spotify`)

    // Should show sign in button when not authenticated
    await expect(page.getByText('Sign In with Spotify')).toBeVisible()

    // Server token section should be present
    await expect(page.getByText('Server Token Status')).toBeVisible()
  })

  test('token endpoint is gated in production', async ({ request }) => {
    // In a production test environment, this endpoint should be disabled.
    const res = await request.get(`${BASE}/api/debug/spotify-token`)
    expect(res.status()).toBe(404)
  })
})
