// @ts-nocheck
import { test, expect } from './lib'
import config from '../../utils/config'

test.describe('Workflow Assessment', () => {
  test('should assess the workflow', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('HRM')
  })
})
