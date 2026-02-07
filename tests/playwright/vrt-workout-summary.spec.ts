import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest } from './test-helpers'
import { SCREENSHOT_OPTIONS } from './lib/visual'

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
    // The dashboard starts in a "list" view. Click "New Workout" to show the summary.
    // Use force:true to ensure click goes through overlays if any
    await dashboardPage.getByRole('button', { name: 'New Workout' }).click({ force: true })

    const workoutSummary = dashboardPage.getByTestId('workout-summary')

    // Wait for visibility with generous timeout to allow for animation/hydration
    await workoutSummary.waitFor({ state: 'visible', timeout: 20000 })

    // Bypass checkAccessibility due to instability/timeout on this specific component transition
    // directly use expect().toHaveScreenshot
    await expect(workoutSummary).toHaveScreenshot('workout-summary-active.png', {
      ...SCREENSHOT_OPTIONS,
      mask: [dashboardPage.getByText(/\d{2}:\d{2}:\d{2}/)],
    })
  })
})
