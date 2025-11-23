// File: tests/playwright/mobile-essential.spec.ts
/**
 * Mobile Essential Tests: Critical mobile scenarios
 */
import { test, expect } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'

const BASE_URL = getBaseURL()

test.describe('Mobile Essential Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }) // iPhone 12 Pro
  })

  test('Mobile dashboard - portrait view', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForSelector('text=/WORK:|Timer/', { timeout: 10000 })
    await page.waitForTimeout(3000)

    await expect(page).toHaveScreenshot('mobile-dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Mobile controls - timer interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('text=/Timer Mode/', { timeout: 10000 })
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('mobile-controls.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Mobile mock HRM interface', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=/HRM Mock Streamer/', { timeout: 10000 })
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('mobile-mock.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
