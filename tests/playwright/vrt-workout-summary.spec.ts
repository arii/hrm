import { test } from './fixtures'
import { takeScreenshot } from './lib/visual'
import { HRM_ROUTES } from './lib/setup'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Test suite for VRT
test.describe('WorkoutSummary Component VRT', () => {
  test('active state', async ({ dashboardPage }) => {
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
