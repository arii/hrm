import { expect } from '@playwright/test'
import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  mockSpotifyPlaybackState,
  mockLoggedInSession,
  getSpotifyMasks,
  resetServerState,
} from './lib'
import { checkAccessibility } from './lib/accessibility'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { VRT_TIMEOUTS } from './lib/timeouts'

test.describe('Component-Specific VRT', () => {
  test.beforeEach(async ({ dashboardPage, request }) => {
    await resetServerState(request)
    await setupMinimalVisualRegressionTest(dashboardPage, '/')
  })

  test('BottomNavBar highlights correct icon', async ({ dashboardPage }) => {
    const bottomNav = dashboardPage.getByTestId('bottom-nav-bar')
    await takeScreenshot(bottomNav, 'bottom-nav-bar.png')
  })

  test('Footer rendering', async ({ dashboardPage }) => {
    const footer = dashboardPage.getByTestId('footer')
    await takeScreenshot(footer, 'footer.png', {
      maxDiffPixelRatio: 0.1,
    })
  })

  test('LoadingIndicator visibility', async ({ dashboardPage }) => {
    // Force visibility and pause animation for VRT
    await dashboardPage.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="loading-indicator"]'
      ) as HTMLElement
      if (el) {
        el.style.opacity = '1'
        el.style.visibility = 'visible'
        // Force an opaque background to prevent pixel leakage from underlying content
        el.style.backgroundColor = 'rgb(0, 0, 0)'
        // Pause any CSS animations/transitions specifically on this element
        el.style.animationPlayState = 'paused'
        el.style.transition = 'none'
      }
    })
    const loadingIndicator = dashboardPage.getByTestId('loading-indicator')
    await expect(loadingIndicator).toBeVisible()

    // Mask the animated progress circle as it's highly flaky in VRT
    const progress = loadingIndicator.getByTestId('loading-indicator-progress')

    await takeScreenshot(loadingIndicator, 'loading-indicator.png', {
      screenshotOptions: {
        mask: [progress],
      },
    })
  })

  test('GoogleDocViewer shrunk state', async ({ dashboardPage }) => {
    // Ensure we are in non-native mode for this test
    await dashboardPage.goto('/?native=false')
    await waitForPageReady(dashboardPage)

    const toggleButton = dashboardPage.getByLabel('Collapse document')
    await toggleButton.click()
    const viewer = dashboardPage
      .getByTestId('google-doc-viewer-iframe')
      .locator('..')
    await takeScreenshot(viewer, 'google-doc-viewer-shrunk.png')
  })

  test('SpotifyDeviceSelector menu', async ({ dashboardPage, context }) => {
    await mockLoggedInSession(context)
    await dashboardPage.reload()
    await waitForPageReady(dashboardPage)

    await mockSpotifyPlaybackState(dashboardPage, {
      playback: {
        is_playing: true,
        volume_percent: 50,
        isMuted: false,
        progress_ms: 0,
        track: {
          id: 'vrt-track',
          name: 'VRT Test Track',
          artist: 'VRT Artist',
          albumName: 'VRT Album',
          albumArtUrl: 'https://via.placeholder.com/150',
        },
      },
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
          volume_percent: 50,
        },
      ],
    })

    const selectorButton = dashboardPage.getByTestId('spotify-device-select')
    await expect(selectorButton).toBeVisible({
      timeout: VRT_TIMEOUTS.STANDARD,
    })
    await selectorButton.click()

    const menu = dashboardPage
      .locator('[data-testid="spotify-device-selector-menu-paper"]')
      .last()
    await expect(menu).toBeVisible()

    // Wait for the opacity transition to finish rendering
    await expect(menu).toHaveCSS('opacity', '1')

    // Perform manual accessibility check on the specific menu element to ensure context validity
    await checkAccessibility(menu)

    await takeScreenshot(menu, 'spotify-device-selector-menu.png', {
      threshold: 0.2, // Tighter threshold for the Paper element
      skipA11y: true, // Accessibility checked manually above
      mask: getSpotifyMasks(dashboardPage),
    })
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
    await dashboardPage.goto('/?test-error=true&testing=true')

    const errorFallback = dashboardPage.getByTestId('error-fallback')
    await expect(errorFallback).toBeVisible({
      timeout: VRT_TIMEOUTS.EXTENDED,
    })
    await takeScreenshot(errorFallback, 'error-fallback.png')
  })
})
