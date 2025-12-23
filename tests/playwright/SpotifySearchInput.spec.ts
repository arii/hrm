
import { test, expect } from '@playwright/test'

test.describe('SpotifySearchInput', () => {
  test('should show loading indicator, then results', async ({ page }) => {
    await page.goto('/client/spotify-selection')
    await page.route('/api/spotify/search?q=test', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          tracks: {
            items: [{ id: '1', name: 'Test Track', artists: [{ name: 'Test Artist' }] }],
          },
        }),
      })
    })

    await page.getByPlaceholder('Search Spotify...').fill('test')
    await expect(page.getByRole('progressbar')).toBeVisible()
    await expect(page.getByText('Test Track by Test Artist')).toBeVisible()
    await expect(page.getByRole('progressbar')).not.toBeVisible()
  })

  test('should show "No results found"', async ({ page }) => {
    await page.goto('/client/spotify-selection')
    await page.route('/api/spotify/search?q=noresults', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ tracks: { items: [] } }),
      })
    })

    await page.getByPlaceholder('Search Spotify...').fill('noresults')
    await expect(page.getByText('No results found.')).toBeVisible()
  })

  test('should show error message', async ({ page }) => {
    await page.goto('/client/spotify-selection')
    await page.route('/api/spotify/search?q=error', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to fetch results.' }),
      })
    })

    await page.getByPlaceholder('Search Spotify...').fill('error')
    await expect(page.getByText('Failed to fetch results.')).toBeVisible()
  })

  test('should clear the input', async ({ page }) => {
    await page.goto('/client/spotify-selection')
    const input = page.getByPlaceholder('Search Spotify...')
    await input.fill('test')
    await expect(input).toHaveValue('test')
    await page.getByTestId('clear-button').click()
    await expect(input).toHaveValue('')
  })
})
