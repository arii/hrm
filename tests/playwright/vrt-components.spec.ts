import { expect } from '@playwright/test'
import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  mockSpotifyPlaybackState,
  mockLoggedInSession,
} from './lib'
import { checkAccessibility } from './lib/accessibility'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { VRT_TIMEOUTS } from './lib/timeouts'

test.describe('Component-Specific VRT', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage, '/')
  })

  test('BottomNavBar highlights correct icon', async ({ dashboardPage }) => {
    const bottomNav = dashboardPage.getByTestId('bottom-nav-bar')
    await takeScreenshot(bottomNav, 'bottom-nav-bar.png', {
      maxDiffPixelRatio: 0.2,
      threshold: 0.3,
    })
  })

  test('Footer rendering', async ({ dashboardPage }) => {
    const footer = dashboardPage.getByTestId('footer')
    await takeScreenshot(footer, 'footer.png', {
      maxDiffPixelRatio: 0.2,
      threshold: 0.3,
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
        // Ensure background is solid for stable VRT
        el.style.backgroundColor = '#000000'
        // Pause any CSS animations/transitions specifically on this element
        el.style.animationPlayState = 'paused'
        el.style.transition = 'none'
      }
    })
    const loadingIndicator = dashboardPage.getByTestId('loading-indicator')
    await expect(loadingIndicator).toBeVisible()
    await takeScreenshot(loadingIndicator, 'loading-indicator.png', {
      mask: [dashboardPage.getByTestId('loading-indicator-spinner')],
      threshold: 0.3,
      maxDiffPixelRatio: 0.1,
    })
  })

  test('GoogleDocViewer shrunk state', async ({ dashboardPage }) => {
    // Ensure we are in non-native mode and have a valid mock URL
    const mockIframeUrl = encodeURIComponent(
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'
    )
    await dashboardPage.goto(`/?native=false&iframeUrl=${mockIframeUrl}`)
    await dashboardPage.waitForLoadState('networkidle')
    await waitForPageReady(dashboardPage)

    const toggleButton = dashboardPage.getByLabel('Collapse document')
    await expect(toggleButton).toBeVisible({ timeout: VRT_TIMEOUTS.EXTENDED })
    await toggleButton.click()
    const viewer = dashboardPage
      .getByTestId('google-doc-viewer-iframe')
      .locator('..')
    await takeScreenshot(viewer, 'google-doc-viewer-shrunk.png')
  })

  test('WorkoutTableHeader rendering', async ({ dashboardPage }) => {
    // Ensure we are in native mode and have a valid mock URL
    const mockWorkoutUrl = encodeURIComponent(
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
    )
    await dashboardPage.goto(`/?native=true&workoutUrl=${mockWorkoutUrl}`)
    await dashboardPage.waitForLoadState('networkidle')
    await waitForPageReady(dashboardPage)

    const tableHeader = dashboardPage.getByTestId('workout-table-header')
    await expect(tableHeader).toBeVisible({ timeout: VRT_TIMEOUTS.EXTENDED })
    await takeScreenshot(tableHeader, 'workout-table-header.png')
  })

  test('SpotifyDeviceSelector menu', async ({ dashboardPage, context }) => {
    // Mock session to appear logged in
    await mockLoggedInSession(context)
    await dashboardPage.reload()
    await waitForPageReady(dashboardPage)

    // Mock Spotify state with devices to show the component naturally
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

    const selectorButton = dashboardPage.getByTestId(
      'spotify-device-selector-button'
    )
    await expect(selectorButton).toBeVisible({
      timeout: VRT_TIMEOUTS.EXTENDED,
    })
    // Ensure button is stable before clicking
    await selectorButton.hover()
    await selectorButton.click()

    const menu = dashboardPage.getByTestId('spotify-device-selector-menu')
    await expect(menu).toBeVisible()

    // Perform manual accessibility check on the specific menu element to ensure context validity
    await checkAccessibility(menu)

    await takeScreenshot(menu, 'spotify-device-selector-menu.png', {
      maxDiffPixelRatio: 0.15,
      threshold: 0.3,
      skipA11y: true, // Accessibility checked manually above
    })
  })

  test('RefreshIconButton states', async ({ dashboardPage }) => {
    // Ensure we have a valid component rendered with a refresh button
    const mockWorkoutUrl = encodeURIComponent(
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
    )
    await dashboardPage.goto(`/?native=true&workoutUrl=${mockWorkoutUrl}`)
    await dashboardPage.waitForLoadState('networkidle')
    await waitForPageReady(dashboardPage)

    const refreshButton = dashboardPage
      .getByTestId('refresh-icon-button')
      .first()
    await expect(refreshButton).toBeVisible({ timeout: VRT_TIMEOUTS.EXTENDED })
    await takeScreenshot(refreshButton, 'refresh-icon-button.png')
    await refreshButton.hover()
    await takeScreenshot(refreshButton, 'refresh-icon-button-hover.png')
  })

  test('ErrorFallback UI', async ({ dashboardPage }) => {
    // Navigate to dashboard with test-error=true to trigger the real ErrorBoundary and ErrorFallback component.
    // NOTE: This error is now triggered client-side to avoid noisy server logs and 500 responses.
    await dashboardPage.goto('/?test-error=true&testing=true')

    const errorFallback = dashboardPage.getByTestId('error-fallback')
    // Explicit extended timeout for ErrorFallback as triggering the error boundary and
    // rendering the fallback UI can be slower on CI environments.
    await expect(errorFallback).toBeVisible({
      timeout: VRT_TIMEOUTS.EXTENDED,
    })
    await takeScreenshot(errorFallback, 'error-fallback.png')
  })
})
