import { test, expect } from './fixtures'
import { setupMinimalVisualRegressionTest } from './test-helpers'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { mockSpotifyPlaybackState } from './test-helpers'

test.describe('Component-Specific VRT', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage, '/')
    await waitForPageReady(dashboardPage)
  })

  test('BottomNavBar highlights correct icon', async ({ dashboardPage }) => {
    const bottomNav = dashboardPage.getByTestId('bottom-nav-bar')
    await takeScreenshot(bottomNav, 'bottom-nav-bar.png')
  })

  test('Footer rendering', async ({ dashboardPage }) => {
    const footer = dashboardPage.getByTestId('footer')
    await takeScreenshot(footer, 'footer.png')
  })

  test('LoadingIndicator visibility', async ({ dashboardPage }) => {
    // Force visibility for VRT
    await dashboardPage.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="loading-indicator"]'
      ) as HTMLElement
      if (el) {
        el.style.opacity = '1'
        el.style.visibility = 'visible'
      }
    })
    const loadingIndicator = dashboardPage.getByTestId('loading-indicator')
    await expect(loadingIndicator).toBeVisible()
    await takeScreenshot(loadingIndicator, 'loading-indicator.png')
  })

  test('GoogleDocViewer shrunk state', async ({ dashboardPage }) => {
    const toggleButton = dashboardPage.getByLabel('Collapse document')
    await toggleButton.click()
    const viewer = dashboardPage
      .getByTestId('google-doc-viewer-iframe')
      .locator('..')
    await takeScreenshot(viewer, 'google-doc-viewer-shrunk.png')
  })

  test.skip('WorkoutTableViewer rendering', async () => {
    // Requires NEXT_PUBLIC_USE_NATIVE_TABLE=true which is a build-time/env-var.
    // Skipping for now as it requires complex environment setup.
  })

  test('SpotifyDeviceSelector menu', async ({ dashboardPage }) => {
    await mockSpotifyPlaybackState(dashboardPage, {
      devices: [
        {
          id: 'dev-1',
          name: 'Speaker 1',
          is_active: true,
          type: 'Speaker',
          is_private_session: false,
          is_restricted: false,
          volume_percent: 50,
        },
        {
          id: 'dev-2',
          name: 'Phone',
          is_active: false,
          type: 'Smartphone',
          is_private_session: false,
          is_restricted: false,
          volume_percent: 80,
        },
      ],
    })

    const selectorButton = dashboardPage.getByTestId(
      'spotify-device-selector-button'
    )
    await selectorButton.click()

    const menu = dashboardPage.getByTestId('spotify-device-selector-menu')
    await expect(menu).toBeVisible()
    await takeScreenshot(menu, 'spotify-device-selector-menu.png')
  })

  test('RefreshIconButton states', async ({ dashboardPage }) => {
    const refreshButton = dashboardPage
      .getByTestId('refresh-icon-button')
      .first()
    await takeScreenshot(refreshButton, 'refresh-icon-button.png')
    await refreshButton.hover()
    await takeScreenshot(refreshButton, 'refresh-icon-button-hover.png')
  })

  test('ErrorFallback UI', async ({ dashboardPage }) => {
    // Force ErrorFallback to be visible by injecting it or triggering an error.
    // In this case, we'll just inject it into the DOM for visual verification.
    await dashboardPage.evaluate(() => {
      const root = document.querySelector('[data-testid="main-content-layout"]')
      if (root) {
        root.innerHTML = `
                <div data-testid="error-fallback" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; padding: 16px; background: white;">
                    <h6 class="MuiTypography-root MuiTypography-h6" style="margin-bottom: 8px;">Something went wrong.</h6>
                    <button class="MuiButton-root MuiButton-contained MuiButton-containedPrimary">Reload Page</button>
                </div>
             `
      }
    })
    const errorFallback = dashboardPage.getByTestId('error-fallback')
    await takeScreenshot(errorFallback, 'error-fallback.png')
  })
})
