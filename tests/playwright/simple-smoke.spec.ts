// File: tests/playwright/simple-smoke.spec.ts
import { test, expect } from '@playwright/test'
import { BASE_URL } from './test-helpers'

test.describe('Simple Smoke Test', () => {
  test('should load the homepage and have the correct title', async ({
    page,
  }) => {
    // Listen for console logs
    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));

    await page.goto(BASE_URL)
    await page.evaluate(() => new Promise(resolve => window.addEventListener('test-ready', resolve)))
    await expect(page).toHaveTitle(/HRM | Real-Time Heart Rate Monitor/)
  })
})
