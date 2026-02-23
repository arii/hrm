import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest } from './lib'
import { takeScreenshot } from './lib/visual'
import { HRM_ROUTES } from './lib/setup'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let dashboardPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('WorkoutSummary Component VRT', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }, testInfo) => {
    const useNativeTable = testInfo.project.use.useNativeTable as
      | boolean
      | undefined
    const setup = await setupVisualRegressionTest(browser, { useNativeTable })
    context = setup.context
    dashboardPage = setup.dashboardPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  test('active state', async () => {
    // Navigate to experimental dashboard
    await dashboardPage.goto(HRM_ROUTES.EXPERIMENTAL)
    // The dashboard starts in a "list" view. Click "New Workout" to show the summary.
    await dashboardPage.getByRole('button', { name: 'New Workout' }).click()
    const workoutSummary = dashboardPage.getByTestId('workout-summary')

    // Mask the duration, since it's dynamic
    await takeScreenshot(workoutSummary, 'workout-summary-active.png', {
      mask: [dashboardPage.getByText(/\d{2}:\d{2}:\d{2}/)],
    })
  })
})
