import { expect, test } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'

const BASE = getBaseURL()

test.describe('HRM debug endpoints', () => {
  test('health and session endpoints respond', async ({ request }) => {
    const health = await request.get(`${BASE}/api/health/simple`)
    expect(health.ok()).toBeTruthy()
    const healthJson = await health.json()
    expect(healthJson.status).toBe('ok')

    const session = await request.get(`${BASE}/api/debug/session`)

    // In production (the default for Playwright webserver), debug endpoints are blocked.
    // We expect a 404 with a specific JSON error message from the middleware.
    // NOTE: This test strictly verifies that we don't leak debug info in the standard test environment.
    if (session.status() === 404) {
      const body = await session.json()
      expect(body.error).toBe('Endpoint unavailable in production')
    } else if (session.status() === 200) {
      // This should only happen in local dev environments where NODE_ENV is not production.
      // If this happens in CI, it indicates a security failure.
      const s = await session.json()
      expect(typeof s).toBe('object')

      // In CI we definitely expect production mode
      if (process.env.CI === 'true') {
        throw new Error(
          'Security failure: Debug endpoint accessible (200 OK) in CI environment'
        )
      }
    } else {
      throw new Error(`Unexpected status code: ${session.status()}`)
    }
  })
})
