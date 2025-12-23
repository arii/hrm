// File: tests/playwright/hrm-dashboard.spec.ts
import { test, expect } from '@playwright/test'
import { seedHrmData } from './test-helpers'

test.describe('HRM Dashboard', () => {
  test('should display the HRM dashboard with seeded data', async ({ page }) => {
    // Seed some HRM data before the test
    await seedHrmData()

    // Navigate to the dashboard
    await page.goto('/')

    // Wait for the dashboard to load
    await expect(page.getByRole('heading', { name: 'Heart Rate Analytics' })).toBeVisible()

    // Check for the summary statistics
    await expect(page.getByText('Average BPM')).toBeVisible()
    await expect(page.getByText('Max BPM')).toBeVisible()
    await expect(page.getByText('Min BPM')).toBeVisible()

    // Check for the time in zones chart
    await expect(page.getByText('Time in Zones (minutes)')).toBeVisible()

    // Check for the history chart
    await expect(page.getByTestId('hrm-history-chart').locator('.recharts-wrapper')).toBeVisible()

    // Check for the zones chart
    await expect(page.getByTestId('hrm-zones-chart').locator('.recharts-wrapper')).toBeVisible()
  })
})
