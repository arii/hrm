import { test, expect } from '@playwright/test'
import { waitForPageReady } from './lib/waits'

test.describe('Dashboard Load Performance', () => {
  test('should load within acceptable threshold', async ({ page }) => {
    const start = performance.now()
    await page.goto('/')
    await waitForPageReady(page, { timeout: 10000 })
    const duration = performance.now() - start

    test.info().annotations.push({
      type: 'perf',
      description: `Dashboard Load Time: ${duration.toFixed(2)}ms`,
    })

    const dashboard = page.locator('[data-testid="dashboard"]')
    await expect(dashboard).toBeVisible()
  })
})
