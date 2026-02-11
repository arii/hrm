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

    // In production, debug endpoints are blocked by middleware/rewrites and return 404
    if (session.status() === 404) {
      // Check if it returns the custom JSON error from middleware
      const contentType = session.headers()['content-type']
      if (contentType && contentType.includes('application/json')) {
        const body = await session.json()
        expect(body.error).toBe('Endpoint unavailable in production')
      }
      return
    }

    // Otherwise (e.g. in dev), it should respond normally
    expect(session.status()).toBeLessThan(500)
    const s = await session.json()
    expect(typeof s).toBe('object')
  })
})
