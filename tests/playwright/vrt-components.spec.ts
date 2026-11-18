import { expect } from '@playwright/test'
import { test } from './fixtures'
import { setupMinimalVisualRegressionTest } from './lib'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'
import { VRT_TIMEOUTS } from './lib/timeouts'

test.describe('Component-Specific VRT', () => {
  test('dashboard omits the bottom navigation', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage, '/')
    const bottomNav = dashboardPage.getByTestId('bottom-nav-bar')
    await expect(bottomNav).toHaveCount(0)
  })

  test('dashboard omits the footer', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage, '/')
    const footer = dashboardPage.getByTestId('footer')
    await expect(footer).toHaveCount(0)
  })

  test('LoadingIndicator visibility', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage, '/')
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
      mask: [progress],
    })
  })

  test('WorkoutPhaseGrid rendering', async ({ dashboardPage }) => {
    // Setup network interception first
    await dashboardPage.route('/api/workout*', async (route) => {
      await route.fulfill({
        json: {
          headers: ['20/10', '3 x 10'],
          columns: [
            ['Jumping Jacks', 'High Knees'],
            ['Squats (10 reps)', 'Plank'],
          ],
        },
      })
    })

    await dashboardPage.goto('/?testing=true')
    await waitForPageReady(dashboardPage)

    const tableHeader = dashboardPage.getByTestId('workout-phase-grid')
    await expect(tableHeader).toBeVisible()
    await takeScreenshot(tableHeader, 'workout-phase-grid.png')
  })

  test('dashboard menu exposes setup navigation', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage, '/')
    await dashboardPage
      .getByRole('button', { name: 'Open dashboard menu' })
      .click()
    const menu = dashboardPage.getByRole('menu')
    for (const name of [
      'Controls',
      'Stream',
      'Spotify',
      'Experiments',
      'Profile',
    ]) {
      await expect(
        menu.getByRole('menuitem', { name, exact: true })
      ).toBeVisible()
    }
    await expect(
      menu.getByRole('menuitem', { name: /^(Login with|Log out of) Spotify$/ })
    ).toBeVisible()
  })

  test('RefreshIconButton states', async ({ dashboardPage }) => {
    await setupMinimalVisualRegressionTest(dashboardPage, '/')
    const refreshButton = dashboardPage.getByTestId('refresh-icon-button')
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
