import { expect } from '@playwright/test'
import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  mockSpotifyPlaybackState,
  mockLoggedInSession,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

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

  test.skip('WorkoutTableHeader rendering', async () => {
    // Requires NEXT_PUBLIC_USE_NATIVE_TABLE=true which is a build-time/env-var.
    // Skipping for now as it requires complex environment setup.
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
    await expect(selectorButton).toBeVisible({ timeout: 15000 })
    await selectorButton.click()

    const menu = dashboardPage.getByTestId('spotify-device-selector-menu')
    await expect(menu).toBeVisible()
    await takeScreenshot(menu, 'spotify-device-selector-menu.png', {
      maxDiffPixelRatio: 0.15,
      threshold: 0.3,
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
    // Navigate to dashboard with test-error=true to trigger the real ErrorBoundary and ErrorFallback component
    await dashboardPage.goto('/?test-error=true&testing=true')

    const errorFallback = dashboardPage.getByTestId('error-fallback')
    await expect(errorFallback).toBeVisible()
    await takeScreenshot(errorFallback, 'error-fallback.png')
  })
})
