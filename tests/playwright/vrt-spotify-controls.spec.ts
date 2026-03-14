import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest, mockLoggedInSession } from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let controlPage: Page
let dashboardPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    controlPage = setup.controlPage
    dashboardPage = setup.dashboardPage

    // Mock session to ensure consistent authenticated state for components
    await mockLoggedInSession(context)
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  // Add a beforeEach hook to wait for the page to be ready before each test
  test.beforeEach(async () => {
    await waitForPageReady(controlPage)
    await waitForPageReady(dashboardPage)

    // Ensure Spotify service is initialized to prevent transient loading states in VRT
    await controlPage.evaluate(() => {
      window.__TEST_CONTROLS__?.dispatch({
        type: 'SPOTIFY_SERVICE_INIT_UPDATE',
        payload: true,
      })
    })
    // Wait for the service initialized state to reflect in UI
    await expect(
      controlPage.getByTestId('spotify-initializing-spinner')
    ).not.toBeVisible()
  })

  test.describe('SpotifyControls Component', () => {
    test('initial, logged-out state', async () => {
      const spotifyControls = controlPage.getByTestId('spotify-controls')

      // Ensure no active devices and neutral track state for stable VRT
      await controlPage.evaluate(() => {
        window.__TEST_CONTROLS__?.dispatch({
          type: 'SPOTIFY_UPDATE',
          payload: {
            devices: [],
            playback: {
              track: { name: 'Awaiting Login...', artist: '' },
              is_playing: false,
              volume_percent: 50,
            },
          },
        })
      })

      // Ensure the "Select Music" button is visible, indicating state is applied
      await expect(
        controlPage.getByTestId('spotify-select-music-button')
      ).toHaveText(/Select Music/i)

      // Ensure element is visible before screenshot
      await spotifyControls.waitFor({ state: 'visible' })

      await takeScreenshot(spotifyControls, 'spotify-controls-logged-out.png')
    })

    test('select music button hover state', async () => {
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
