import { expect, test } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'

const BASE = getBaseURL()

test.describe('HRM debug endpoints', () => {
  test('ping and session endpoints are gated in production', async ({
    request,
  }) => {
    // In a production test environment, these endpoints should be disabled.
    const ping = await request.get(`${BASE}/api/debug/ping`)
    expect(ping.status()).toBe(404)

    const session = await request.get(`${BASE}/api/debug/session`)
    expect(session.status()).toBe(404)
  })
})
