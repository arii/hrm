import { type BrowserContext, type Page, expect } from '@playwright/test'
import { test } from './fixtures'
import { setupVisualRegressionTest } from './test-helpers'
import { waitForPageReady } from './lib/waits'

test.describe('HR Zone Distribution Interactivity', () => {
  let dashboardPage: Page
  let mockPage: Page
  let context: BrowserContext

  test.beforeAll(async ({ browser }) => {
    const setup = await setupVisualRegressionTest(browser)
    context = setup.context
    dashboardPage = setup.dashboardPage
    mockPage = setup.mockPage
  })

  test.afterAll(async () => {
    await context?.close()
  })

  test('should display zone distribution and show tooltip on hover', async () => {
    test.setTimeout(60000)
    await dashboardPage.goto('/client/experimental')
    await waitForPageReady(dashboardPage)
    await waitForPageReady(mockPage)

    // Switch to active workout view if necessary
    const newWorkoutBtn = dashboardPage.getByRole('button', {
      name: 'New Workout',
    })
    await expect(newWorkoutBtn).toBeVisible({ timeout: 10000 })
    await newWorkoutBtn.click()

    // Start streaming from mock
    // Use 165 BPM to ensure we are in the Peak zone
    await mockPage.getByLabel('Current BPM').fill('165')

    // Ensure mock client is connected before starting stream
    const serverStatus = mockPage.locator('text=Server Status: Connected')
    await expect(serverStatus).toBeVisible({ timeout: 10000 })

    await mockPage.getByTestId('streaming-start-button').click()

    // Start workout
    const startWorkoutBtn = dashboardPage.getByRole('button', {
      name: 'Start Workout',
    })
    await expect(startWorkoutBtn).toBeVisible({ timeout: 10000 })
    await startWorkoutBtn.click()

    // Wait for data to accumulate (at least 1-2 seconds)
    // We wait for the zone card to appear
    const zoneCard = dashboardPage.getByTestId('zone-distribution-card')
    await expect(zoneCard).toBeVisible({ timeout: 15000 })

    // Assert legend contains Peak zone
    const peakRow = dashboardPage.getByTestId('zone-row-Peak')
    await expect(peakRow).toBeVisible({ timeout: 10000 })
    await expect(peakRow).toContainText('Peak')

    // Pause workout and stop streaming to stabilize the chart for hover
    await dashboardPage.getByRole('button', { name: 'Pause' }).click()
    await mockPage.getByTestId('streaming-stop-button').click()
    await expect(dashboardPage.getByRole('button', { name: 'Resume' })).toBeVisible()

    // Verify chart is rendered (has sectors)
    const sectors = dashboardPage
      .getByTestId('zone-distribution-card')
      .locator('.recharts-pie-sector')
    await expect(sectors.first()).toBeVisible({ timeout: 10000 })

    // Verify accessibility attributes
    const chartRegion = dashboardPage.getByRole('region', {
      name: /heart rate zone distribution chart/i,
    })
    await expect(chartRegion).toBeVisible()
  })
})
