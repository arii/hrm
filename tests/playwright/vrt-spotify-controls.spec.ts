import { test } from './fixtures'
import { mockLoggedInSession } from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Add a beforeEach hook to wait for the page to be ready before each test
  test.beforeEach(async ({ controlPage, dashboardPage, context }) => {
    // Mock session to ensure consistent authenticated state for components
    await mockLoggedInSession(context)

    await controlPage.goto('/client/control')
    await dashboardPage.goto('/')

    await waitForPageReady(controlPage)
    await waitForPageReady(dashboardPage)
  })

  test.describe('SpotifyControls Component', () => {
    test('initial, logged-out state', async ({ controlPage }) => {
      const spotifyControls = controlPage.getByTestId('spotify-controls')
      // Ensure element is visible before screenshot
      await spotifyControls.waitFor({ state: 'visible' })
      await takeScreenshot(spotifyControls, 'spotify-controls-logged-out.png')
    })

    test('select music button hover state', async ({ controlPage }) => {
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
