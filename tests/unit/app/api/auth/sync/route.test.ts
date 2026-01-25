// tests/unit/app/api/auth/sync/route.test.ts
import { POST } from '@/app/api/auth/sync/route'
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { env } from '@/lib/env'

jest.mock('next-auth/jwt')
jest.mock('@/lib/env', () => ({
  env: {
    INTERNAL_API_URL: 'http://localhost:3000',
    INTERNAL_API_SECRET: 'test-secret',
  },
}))

global.fetch = jest.fn()

describe('/api/auth/sync', () => {
  let req: NextRequest

  beforeEach(() => {
    req = new NextRequest('http://localhost/api/auth/sync', {
      method: 'POST',
    })
    ;(fetch as jest.Mock).mockClear()
    ;(getToken as jest.Mock).mockClear()
  })

  it('should sync the token successfully', async () => {
    ;(getToken as jest.Mock).mockResolvedValue({ accessToken: 'test-token' })
    ;(fetch as jest.Mock).mockResolvedValue({ ok: true })

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ message: 'Token synced successfully' })
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/internal/sync-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': 'test-secret',
      },
      body: JSON.stringify({ accessToken: 'test-token' }),
    })
  })

  it('should return 401 if no access token is found in the session', async () => {
    ;(getToken as jest.Mock).mockResolvedValue(null)

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'No access token found in session' })
  })

  it('should return 500 if the internal API call fails', async () => {
    ;(getToken as jest.Mock).mockResolvedValue({ accessToken: 'test-token' })
    ;(fetch as jest.Mock).mockResolvedValue({ ok: false })

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Internal Server Error' })
  })
})
