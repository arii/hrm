// File: tests/playwright/simple-smoke.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Simple Smoke Test', () => {
  test('should load the homepage and have the correct title', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/HRM | Real-Time Heart Rate Monitor/)
  })
})
