// File: tests/playwright/simple-smoke.spec.ts
import { test, expect } from '@playwright/test'
import { BASE_URL } from './lib'

test.describe('Simple Smoke Test', () => {
  test('should load the homepage and have the correct title', async ({
    page,
  }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/HRM | Real-Time Heart Rate Monitor/)
  })

  test('should have working health check endpoints', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health/simple`)
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.status).toBe('ok')

    const detailedResponse = await request.get(
      `${BASE_URL}/api/health/detailed`
    )
    // Detailed health check might return 503 if some non-critical services are degraded (e.g. Spotify API)
    // but the endpoint itself should exist and return a valid JSON response.
    expect([200, 503]).toContain(detailedResponse.status())
    const detailedData = await detailedResponse.json()
    expect(detailedData).toHaveProperty('status')
  })

  test('should have working debug session endpoint', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/debug/session`)
    // Endpoint should exist, even if it returns 401 or empty session
    expect(response.status()).toBeLessThan(500)
  })

  test('should have working spotify token endpoints', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/debug/spotify-token-status`
    )
    expect(response.status()).toBeLessThan(500)
  })
})
