// @ts-nocheck
import { test, expect } from './lib'
import config from '../../utils/config'

test.describe('Remote Capabilities', () => {
  test('should connect to the remote server', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('HRM')
  })
})
