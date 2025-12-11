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

  test('token endpoint responds', async ({ request }) => {
    const res = await request.get(`${BASE}/api/debug/spotify-token`)
    // In CI, we may not have a token, so the request might fail.
    // We just want to ensure the endpoint exists and returns a valid JSON response.
    const data = await res.json()
    expect(data).toBeInstanceOf(Object)
  })
})
