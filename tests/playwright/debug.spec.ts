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

    // In CI (production mode), debug endpoints are blocked.
    if (process.env.CI) {
      expect(session.status()).toBe(404)
      const body = await session.json()
      expect(body.error).toBe('Endpoint unavailable in production')
    } else {
      // In local dev, allow 200 or 404 depending on environment config
      expect(session.status()).toBeLessThan(500)
    }
  })
})
