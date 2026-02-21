// tests/playwright/vrt-workout-summary.spec.ts
import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  resetServerState,
  HRM_ROUTES,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'

// Test suite for VRT
test.describe('Visual Regression Tests - Workout Summary', () => {
  test.afterEach(async ({ page }) => {
    // Reset server state after each test
    await resetServerState(page)
  })

  test('active state', async ({ dashboardPage }) => {
    // Navigate to experimental dashboard
    await setupMinimalVisualRegressionTest(
      dashboardPage,
      HRM_ROUTES.EXPERIMENTAL
    )

    // The dashboard starts in a "list" view. Click "New Workout" to show the summary.
    await dashboardPage.getByRole('button', { name: 'New Workout' }).click()
    const workoutSummary = dashboardPage.getByTestId('workout-summary')

    // Mask the duration, since it's dynamic
    await takeScreenshot(workoutSummary, 'workout-summary-active.png', {
      mask: [dashboardPage.getByText(/\d{2}:\d{2}:\d{2}/)],
    })
  })
})
