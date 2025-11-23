// File: tests/playwright/integration-tests.spec.ts
/**
 * Integration Tests: Multi-component and error scenarios
 */
import { test, expect } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'

const BASE_URL = getBaseURL()

test.describe('Integration Tests', () => {
  test('Bluetooth connection flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/connect`)
    await page.waitForSelector('text=/Bluetooth HRM/', { timeout: 5000 })

    // Fill user information
    await page.fill('input[placeholder="Your name"]', 'Test User')
    await page.fill('input[type="number"][placeholder="25"]', '28')
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('bluetooth-connect.png', {
      fullPage: true,
    })
  })

  test('Multi-device coordination', async ({ page, context }) => {
    // Setup multiple tabs
    const controlTab = page
    const dashboardTab = await context.newPage()
    const mockTab = await context.newPage()

    // Initialize all tabs
    await controlTab.goto(`${BASE_URL}/client/control`)
    await controlTab.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    await dashboardTab.goto(BASE_URL)
    await dashboardTab.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })

    await mockTab.goto(`${BASE_URL}/client/mock`)
    await mockTab.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    // Start HR streaming
    await mockTab.getByLabel('User Name').fill('Multi User')
    await mockTab.getByLabel('Current BPM').fill('150')
    await mockTab.click('button:has-text("START")')
<<<<<<< HEAD
    await mockTab.waitForTimeout(2000)
=======
    await expect(
      mockTab.locator('button:has-text("STOP Streaming")')
    ).toBeVisible()
>>>>>>> origin/leader

    // Start timer from control
    await controlTab.fill('input[aria-label="Work duration in seconds"]', '30')
    await controlTab.click('button:has-text("START")')

    // Verify coordination
    await dashboardTab.waitForSelector('text=Multi User', { timeout: 5000 })
    await dashboardTab.waitForSelector('text=/WORK|REST/', { timeout: 5000 })

    // Cleanup
    await controlTab.click('button:has-text("STOP")')
    await mockTab.getByRole('button', { name: /STOP/ }).click()
    await dashboardTab.close()
    await mockTab.close()
  })

  test('Error state handling', async ({ page }) => {
    // Test offline state
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 5000 })

    // Simulate network issues
    await page.context().setOffline(true)
    await page.waitForTimeout(2000)

    // Restore connection
    await page.context().setOffline(false)
    await page.waitForTimeout(2000)

    // Test invalid timer config
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    await page.fill('input[aria-label="Work duration in seconds"]', '0')
    await page.fill('input[aria-label="Rest duration in seconds"]', '0')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('error-handling.png', {
      fullPage: true,
    })
  })
})
