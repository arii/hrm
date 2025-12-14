// @ts-nocheck
import { test, expect } from './lib'
import config from '../../utils/config'

test.describe('Auth Flow', () => {
  test('should redirect to spotify login', async ({ page }) => {
    await page.goto('/api/auth/signin')
    await page.waitForURL('https://accounts.spotify.com/**')
    expect(page.url()).toContain('accounts.spotify.com')
  })
})
