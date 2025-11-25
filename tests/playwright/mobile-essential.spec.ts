// File: tests/playwright/mobile-essential.spec.ts
import { expect, test } from './fixtures'
import { BASE_URL, waitForPageReady } from './test-helpers'

test.describe('Mobile Essential Tests', () => {
  test('Mobile dashboard - portrait view', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
      return
    }
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await expect(page).toHaveScreenshot('mobile-dashboard.png')
  })

  test('Mobile controls - timer interface', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
      return
    }
    await page.goto(`${BASE_URL}/client/control`)
    await waitForPageReady(page)
    await expect(page).toHaveScreenshot('mobile-controls.png')
  })

  test('Mobile navigation - key flows', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
      return
    }
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    // Example of a navigation flow test
    await page.getByRole('link', { name: 'Control Panel' }).click({ timeout: 10000 })
    await page.waitForURL(`${BASE_URL}/client/control`)
    await waitForPageReady(page)
    await expect(page).toHaveURL(`${BASE_URL}/client/control`)
  })
})
