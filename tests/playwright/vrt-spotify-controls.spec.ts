import { type BrowserContext, type Page } from '@playwright/test'
import { test } from '@/tests/playwright/fixtures'
import { setupVisualRegressionTest } from '@/tests/playwright/test-helpers'
import { takeScreenshot } from '@/tests/playwright/lib/visual'
import { waitForPageReady } from '@/tests/playwright/lib/waits'

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
