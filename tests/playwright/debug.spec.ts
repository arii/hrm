// @ts-nocheck
import { test, expect } from './lib'
import config from '../../utils/config'

test.describe('Debug Page', () => {
  test('should display the debug page', async ({ page }) => {
    await page.goto('/debug')
    await expect(page.locator('h1')).toHaveText('Debug')
  })
})
