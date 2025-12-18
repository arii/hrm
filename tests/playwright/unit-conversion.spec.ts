// tests/playwright/unit-conversion.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Unit Conversion', () => {
  test('should allow users to switch between metric and imperial units', async ({
    page,
  }) => {
    await page.goto('http://127.0.0.1:3000/client/connect')

    // Imperial is the default, so check for imperial fields first
    await expect(page.getByLabel('Feet')).toBeVisible()
    await expect(page.getByLabel('Inches')).toBeVisible()
    await expect(page.getByLabel('Your Weight (lbs)')).toBeVisible()

    // Switch to metric
    await page.getByRole('button', { name: 'Metric (kg, cm)' }).click()

    // Check for metric fields
    await expect(page.getByLabel('Your Height (cm)')).toBeVisible()
    await expect(page.getByLabel('Your Weight (kg)')).toBeVisible()

    // Switch back to imperial
    await page.getByRole('button', { name: 'Imperial (lbs, ft, in)' }).click()

    // Check for imperial fields again
    await expect(page.getByLabel('Feet')).toBeVisible()
    await expect(page.getByLabel('Inches')).toBeVisible()
    await expect(page.getByLabel('Your Weight (lbs)')).toBeVisible()
  })
})
