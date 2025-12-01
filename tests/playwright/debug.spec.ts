import { expect, test } from '@playwright/test'
import { getBaseURL } from '@/utils/urls'

const BASE = getBaseURL()

test.describe('HRM debug endpoints', () => {
  test('ping and session endpoints respond', async ({ request }) => {
    const ping = await request.get(`${BASE}/api/debug/ping`)
    expect(ping.ok()).toBeTruthy()
    const pingJson = await ping.json()
    expect(pingJson.ok).toBe(true)

    const session = await request.get(`${BASE}/api/debug/session`)
    // session may return 200 with session or 200+empty or 401; assert not 5xx
    expect(session.status()).toBeLessThan(500)
    const s = await session.json()
    expect(typeof s).toBe('object')
  })
})
