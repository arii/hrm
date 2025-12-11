// tests/storybook/SpotifyDisplay.spec.ts
import { test, expect } from '@playwright/test'

test.describe('SpotifyDisplay Stories', () => {
  test('Logged Out story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-spotifydisplay--logged-out&viewMode=story'
    )
    await expect(
      page.getByRole('button', { name: /Login with Spotify/i })
    ).toBeVisible()
  })

  test('Logged In No Playback story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-spotifydisplay--logged-in-no-playback&viewMode=story'
    )
    await expect(page.getByText('No Active Playback')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  })

  test('Playing story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-spotifydisplay--playing&viewMode=story'
    )
    await expect(page.getByText('Bohemian Rhapsody')).toBeVisible()
    await expect(page.getByText('— Queen')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  })

  test('Paused story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-spotifydisplay--paused&viewMode=story'
    )
    await expect(page.getByText('Bohemian Rhapsody')).toBeVisible()
    await expect(page.getByText('— Queen')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  })

  test('Long Track Name story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-spotifydisplay--long-track-name&viewMode=story'
    )
    await expect(
      page.getByText(
        'The Most Unbelievably Long Song Title Ever Heard In The History Of Music'
      )
    ).toBeVisible()
    await expect(page.getByText('— A Very Wordy Artist Name')).toBeVisible()
  })
})
