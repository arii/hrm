// tests/playwright/vrt-spotify-controls.spec.ts
import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  resetServerState,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'

// Test suite for VRT
test.describe('Visual Regression Tests - Spotify Controls', () => {
  test.afterEach(async ({ page }) => {
    // Reset server state after each test
    await resetServerState(page)
  })

  test.describe('SpotifyControls Component', () => {
    test('initial, logged-out state', async ({ controlPage }) => {
      await setupMinimalVisualRegressionTest(controlPage, '/client/control')
      const spotifyControls = controlPage.getByTestId('spotify-controls')
      // Ensure element is visible before screenshot
      await spotifyControls.waitFor({ state: 'visible' })
      await takeScreenshot(spotifyControls, 'spotify-controls-logged-out.png')
    })

    test('select music button hover state', async ({ controlPage }) => {
      await setupMinimalVisualRegressionTest(controlPage, '/client/control')
      const selectMusicButton = controlPage.getByRole('button', {
        name: 'Select Music',
      })
      await selectMusicButton.hover()
      await takeScreenshot(selectMusicButton, 'select-music-button-hover.png', {
        skipA11y: true,
      })
    })
  })
})
