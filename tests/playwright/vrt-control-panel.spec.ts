import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest } from './lib'
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

  test.describe('ControlPanel Component', () => {
    test('initial state', async () => {
      const controlPanel = controlPage.getByTestId('control-panel')

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

      await takeScreenshot(controlPanel, 'control-panel.png')
    })
  })
})
