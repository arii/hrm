// File: tests/unit/app/api/health/detailed/route.test.ts
import { GET } from '../../../../../../app/api/health/detailed/route'
import { env } from '../../../../../../lib/env'
import { NextRequest } from 'next/server'

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
    const request = new NextRequest('http://localhost/api/health/detailed')
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('httpStatus', 'ok')
    expect(data).toHaveProperty('webSocketStatus', 'ok')
    expect(data).toHaveProperty('spotifyStatus', 'ok')
    expect(data).toHaveProperty('timerStatus', 'ok')
  })

  it('should handle missing NEXTAUTH_URL', async () => {
    env.NEXTAUTH_URL = undefined
    const request = new NextRequest('http://localhost/api/health/detailed')
    const response = await GET(request)
    expect(response.status).toBe(503)
    const data = await response.json()
    expect(data).toHaveProperty('httpStatus', 'error')
  })
})
