
import { test, expect, devices } from '@playwright/test'
import { takeScreenshot } from './lib/visual'

test.describe('Mobile View', () => {
  test('dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('main-content-layout')).toBeVisible()
    await takeScreenshot(page, 'mobile-dashboard.png')
  })

  test('control panel', async ({ page }) => {
    await page.goto('/client/control')
    await expect(page.getByTestId('timer-controls')).toBeVisible()
    await takeScreenshot(page, 'mobile-control-panel.png')
  })
})
