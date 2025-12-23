// File: tests/unit/app/api/hrm/route.test.ts
import { GET } from '../../../../../app/api/hrm/route'
import { getHrmDataHistory } from '../../../../../services/hrmDataService'
import { NextRequest } from 'next/server'

jest.mock('../../../../../services/hrmDataService', () => ({
  getHrmDataHistory: jest.fn(),
}))

describe('GET /api/hrm', () => {
  it('should return the full history when no "since" parameter is provided', async () => {
    const mockHistory = [{ timestamp: Date.now(), hrm: 120, clientId: 'test' }]
    ;(getHrmDataHistory as jest.Mock).mockResolvedValue(mockHistory)

    const req = new NextRequest('http://localhost/api/hrm')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(mockHistory)
    expect(getHrmDataHistory).toHaveBeenCalledWith(undefined)
  })

  it('should return a filtered history when a valid "since" parameter is provided', async () => {
    const since = Date.now() - 3600 * 1000
    const mockHistory = [{ timestamp: Date.now(), hrm: 120, clientId: 'test' }]
    ;(getHrmDataHistory as jest.Mock).mockResolvedValue(mockHistory)

    const req = new NextRequest(`http://localhost/api/hrm?since=${since}`)
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(mockHistory)
    expect(getHrmDataHistory).toHaveBeenCalledWith(since)
  })

  it('should return a 400 error for an invalid "since" parameter', async () => {
    const req = new NextRequest('http://localhost/api/hrm?since=invalid')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body).toHaveProperty('error', 'Invalid query parameters')
  })
})
