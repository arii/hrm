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
    const data = await res.json()
    // We only care that the endpoint responds with our expected JSON structure
    expect(data).toHaveProperty('ok')
    // Token may or may not be present depending on auth state, so we don't assert on `ok` value
    expect(data).toHaveProperty('token')
  })
})
