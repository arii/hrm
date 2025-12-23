// File: tests/unit/app/api/health/detailed/route.test.ts
import { GET } from '../../../../../../app/api/health/detailed/route'
import { env } from '../../../../../../lib/env'

describe('GET /api/health/detailed', () => {
  let originalNextAuthUrl: string | undefined

  beforeEach(() => {
    originalNextAuthUrl = env.NEXTAUTH_URL
  })

  afterEach(() => {
    env.NEXTAUTH_URL = originalNextAuthUrl
  })

  it('should return a 200 OK response', async () => {
    env.NEXTAUTH_URL = 'http://localhost:3000'
    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('httpStatus', 'ok')
    expect(data).toHaveProperty('webSocketStatus', 'ok')
    expect(data).toHaveProperty('spotifyStatus', 'ok')
    expect(data).toHaveProperty('timerStatus', 'ok')
  })

  it('should handle missing NEXTAUTH_URL', async () => {
    env.NEXTAUTH_URL = undefined
    const response = await GET()
    expect(response.status).toBe(200) // The endpoint should still work, but http status will be 'error'
    const data = await response.json()
    expect(data).toHaveProperty('httpStatus', 'error')
  })
})
