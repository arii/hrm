import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import {
  setupVisualRegressionTest,
  HRM_ROUTES,
  waitForPageReady,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let dashboardPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('WorkoutSummary Component VRT', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    dashboardPage = setup.dashboardPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  test('active state', async () => {
    // Navigate to experimental dashboard where this component lives
    await dashboardPage.goto(HRM_ROUTES.EXPERIMENTAL_DASHBOARD)
    await waitForPageReady(dashboardPage)

    // The dashboard starts in a "list" view. Click "New Workout" (or "Back to Active Workout") to show the summary.
    await dashboardPage
      .getByRole('button', { name: /New Workout|Back to Active Workout/i })
      .click()
    const workoutSummary = dashboardPage.getByTestId('workout-summary')

    // Mask the duration, since it's dynamic
    await takeScreenshot(workoutSummary, 'workout-summary-active.png', {
      mask: [dashboardPage.getByText(/\d{2}:\d{2}:\d{2}/)],
    })
  })
})
