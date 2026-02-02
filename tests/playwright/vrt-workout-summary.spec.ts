import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest } from './test-helpers'
import { takeScreenshot } from './lib/visual'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Reusable page objects
let experimentalPage: Page
let context: BrowserContext

// Test suite for VRT
test.describe('WorkoutSummary Component VRT', () => {
  // Centralized setup hook
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser, '/client/experimental')
    context = setup.context
    experimentalPage = setup.dashboardPage
  })

  // Centralized cleanup hook
  test.afterAll(async () => {
    await context?.close()
  })

  test('active state', async () => {
    // Click "New Workout" to show the summary.
    await experimentalPage.getByRole('button', { name: 'New Workout' }).click()

    // Wait for the component to be visible
    await experimentalPage.waitForSelector('[data-testid="workout-summary"]', { timeout: 15000 });

    const workoutSummary = experimentalPage.getByTestId('workout-summary')

    // Mask the duration, since it's dynamic
    await takeScreenshot(workoutSummary, 'workout-summary-active.png', {
      mask: [experimentalPage.getByText(/\d{2}:\d{2}:\d{2}/)],
    })
  })
})
