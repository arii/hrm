import { test, expect } from '@playwright/test'

test.describe('Experimental Analytics Page', () => {
  test('should load the page and render the heart rate chart', async ({
    page,
  }) => {
    // Navigate to the experimental analytics page
    await page.goto('/client/experimental')

    // Start a workout to ensure the chart is rendered
    // Note: The page might be in 'list' view initially if there are previous sessions,
    // or 'active' view if not. We'll handle both.

    // Check if "New Workout" button exists (List View)
    const newWorkoutButton = page.getByRole('button', { name: 'New Workout' })
    if (await newWorkoutButton.isVisible()) {
      await newWorkoutButton.click()
    }

    // Now in Active View. Check if "Start Workout" button exists (Idle State)
    const startWorkoutButton = page.getByRole('button', {
      name: 'Start Workout',
    })
    if (await startWorkoutButton.isVisible()) {
      await startWorkoutButton.click()
    }

    // Check for the chart container
    const chartContainer = page.getByTestId('hr-time-series-chart')
    await expect(chartContainer).toBeVisible()

    // Since the chart is dynamically loaded with ssr: false, it might show a skeleton first.
    // However, the skeleton is inside the same container.
    // We want to verify that the Recharts component eventually renders.
    // Recharts renders an svg or div with class 'recharts-wrapper' or similar structure.
    // A robust way is to check for the text "Heart Rate" in the legend or axis,
    // but the chart might be empty if no data has flowed yet.

    // Let's wait for the Recharts wrapper to appear inside the container
    // The Skeleton renders as a span/div with MuiSkeleton classes.
    // The Chart renders a div with class 'recharts-responsive-container'.

    await expect(
      chartContainer.locator('.recharts-responsive-container')
    ).toBeVisible({ timeout: 10000 })
  })
})
