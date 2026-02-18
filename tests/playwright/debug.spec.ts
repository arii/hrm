import { expect, test } from '@playwright/test'
import { getBaseURL } from '@/utils/urls'

const BASE = getBaseURL()

test.describe('HRM debug endpoints', () => {
  test('health and session endpoints respond', async ({ request }) => {
    const health = await request.get(`${BASE}/api/health/simple`)
    expect(health.ok()).toBeTruthy()
    const healthJson = await health.json()
    expect(healthJson.status).toBe('ok')

    const session = await request.get(`${BASE}/api/debug/session`)
    // session may return 200 with session or 200+empty or 401; assert not 5xx
    expect(session.status()).toBeLessThan(500)
    const s = await session.json()
    expect(typeof s).toBe('object')
  })
})
