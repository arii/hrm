// @ts-nocheck
import { test, expect } from './lib'
import config from '../../utils/config'

test.describe('Spotify Debug', () => {
  test('should load the spotify debug page', async ({ page }) => {
    await page.goto('/debug/spotify')
    await expect(page.locator('h1')).toHaveText('Spotify Debug')
  })
})
