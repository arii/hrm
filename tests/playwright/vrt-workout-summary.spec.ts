import { type BrowserContext, type Page } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest } from './test-helpers'
import { takeScreenshot } from './lib/visual'

test.describe.configure({ mode: 'serial' })

let dashboardPage: Page
let context: BrowserContext

test.describe('WorkoutSummary Component VRT', () => {
  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    dashboardPage = setup.dashboardPage
  })

  test.afterAll(async () => {
    await context?.close()
  })

  test('active state', async () => {
    await dashboardPage.getByRole('button', { name: 'New Workout' }).click()
    const workoutSummary = dashboardPage.getByTestId('workout-summary')

    // Mask the duration, since it's dynamic
    await takeScreenshot(workoutSummary, 'workout-summary-active.png', {
      mask: [dashboardPage.getByText(/\d{2}:\d{2}:\d{2}/)],
    })
  })
})
