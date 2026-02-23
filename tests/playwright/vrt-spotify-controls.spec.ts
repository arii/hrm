import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import {
  setupVisualRegressionTest,
  mockLoggedInSession,
  resetServerState,
} from './lib'
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
  test.beforeEach(async ({ request }) => {
    // 1. Reset server-side state
    await resetServerState(request)

    // 2. Reload pages to ensure clean client state and fresh WebSocket connection
    await controlPage.reload()
    await dashboardPage.reload()

    // 3. Wait for pages to be ready and connected
    await waitForPageReady(controlPage)
    await waitForPageReady(dashboardPage)

    // Ensure WebSocket is re-established after server reset
    await Promise.all([
      controlPage.waitForFunction(
        () => document.body.dataset.connectionStatus === 'connected',
        { timeout: 5000 }
      ),
      dashboardPage.waitForFunction(
        () => document.body.dataset.connectionStatus === 'connected',
        { timeout: 5000 }
      ),
    ])

    // Force main content layout to be visible to avoid flaky blank screenshots due to Framer Motion
    await controlPage.addStyleTag({
      content: `[data-testid="main-content-layout"] { opacity: 1 !important; transform: none !important; }`,
    })
  })

  test.describe('SpotifyControls Component', () => {
    test('initial, logged-out state', async () => {
      const spotifyControls = controlPage.getByTestId('spotify-controls')
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
