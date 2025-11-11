// File: tests/playwright/mobile-essential.spec.ts
/**
 * Mobile Essential Tests: Critical mobile scenarios only
 */
import { test, expect } from '@playwright/test'

const BASE_URL =
  process.env.BASE_URL || process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000'

test.describe('Mobile Essential Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }) // iPhone 12 Pro
  })

  test('Mobile dashboard - portrait view', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('mobile-dashboard.png', {
      fullPage: true,
    })
  })

  test('Mobile controls - timer interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Configure timer
    await page.fill('input[aria-label="Work duration in seconds"]', '30')
    await page.fill('input[aria-label="Rest duration in seconds"]', '15')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('mobile-controls.png', {
      fullPage: true,
    })
  })

  test('Mobile navigation - key flows', async ({ page }) => {
    // Start at dashboard
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })

    // Navigate to controls
    await page.click('text=Phone Controls')
    await page.waitForSelector('text=/Timer Mode/', { timeout: 5000 })

    // Navigate to connect
    await page.click('text=Stream HR')
    await page.waitForSelector('text=/Bluetooth HRM/', { timeout: 5000 })

    // Back to dashboard
    await page.click('text=Dashboard')
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 5000 })

    await expect(page).toHaveScreenshot('mobile-navigation.png', {
      fullPage: true,
    })
  })
})
