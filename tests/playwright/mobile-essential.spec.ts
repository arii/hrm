// File: tests/playwright/mobile-essential.spec.ts
/**
 * Mobile Essential Tests: Critical mobile scenarios
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
    await expect(page.locator('text=/WORK:|Timer/')).toBeVisible()

    await expect(page).toHaveScreenshot('mobile-dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Mobile controls - timer interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/control`)
    await expect(page.locator('text=/Timer Mode/')).toBeVisible()

    await expect(page).toHaveScreenshot('mobile-controls.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Mobile mock HRM interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/mock`)
    await expect(page.locator('text=/HRM Mock Streamer/')).toBeVisible()

    await expect(page).toHaveScreenshot('mobile-mock.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
