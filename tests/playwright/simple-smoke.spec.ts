// File: tests/playwright/simple-smoke.spec.ts
import { test, expect } from '@playwright/test'
import { BASE_URL } from './test-helpers'

test.describe('Simple Smoke Test', () => {
  test('should load the homepage and have the correct title', async ({
    page,
  }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/HRM/)
  })
})
