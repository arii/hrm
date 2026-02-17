import { test, expect } from '@playwright/test'

test.describe('Dashboard Load Performance', () => {
  test('should load the dashboard and become ready within 5 seconds', async ({ page }) => {
    const start = Date.now()

    // Navigate to the dashboard
    await page.goto('/')

    // Wait for the application to signal it's ready
    // The app sets window.__TEST_READY__ = true in various components
    await page.waitForFunction(() => (window as any).__TEST_READY__ === true, {
      timeout: 10000
    })

    const loadTime = Date.now() - start
    console.log(`Dashboard Load Time: ${loadTime}ms`)

    // Assert that the load time is within acceptable limits (5 seconds)
    expect(loadTime).toBeLessThan(5000)

    // Verify critical UI elements are visible
    const dashboard = page.locator('[data-testid="dashboard"]')
    await expect(dashboard).toBeVisible()
  })
})
