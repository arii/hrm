/**
 * @jest-environment node
 */
// Mock dependencies BEFORE importing the route
jest.mock('next-auth/next')
jest.mock('@/services/exportService', () => ({
  generateFIT: jest.fn(),
}))
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

// Also mock @garmin/fitsdk just in case some module resolution hits it
jest.mock('@garmin/fitsdk', () => ({
  Encoder: jest.fn(),
  Profile: {
    MesgNum: {},
    types: {},
  },
}))

import { POST } from '@/app/api/workout/export/[sessionId]/route'
import { getServerSession } from 'next-auth/next'
import { generateFIT } from '@/services/exportService'
import { NextRequest } from 'next/server'
import { RouteContext } from '@/lib/types/index'

// Mock global fetch
global.fetch = jest.fn()

const mockedGetServerSession = getServerSession as jest.Mock
const mockedGenerateFIT = generateFIT as jest.Mock
const mockedFetch = global.fetch as jest.Mock

describe('API Route: /api/workout/export/[sessionId]', () => {
  const sessionId = 'test-session-123'
  const context: RouteContext<{ sessionId: string }> = {
    params: Promise.resolve({ sessionId }),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if user is not logged in', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    const request = new NextRequest(
      'http://localhost/api/workout/export/test',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('logged in')
  })

  it('should return 400 if logged in but not with Strava', async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'some-token',
      provider: 'spotify',
    })
    const request = new NextRequest(
      'http://localhost/api/workout/export/test',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('log in with Strava')
  })

  it('should return 400 if no heart rate data is provided', async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'strava-token',
      provider: 'strava',
    })
    const request = new NextRequest(
      'http://localhost/api/workout/export/test',
      {
        method: 'POST',
        body: JSON.stringify({ hrHistory: [] }),
      }
    )

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No heart rate data')
  })

  it('should successfully upload to Strava', async () => {
    const mockSession = {
      accessToken: 'valid-strava-token',
      provider: 'strava',
    }
    const mockWorkoutData = {
      hrHistory: [{ time: 1000, hr: 80 }],
      averageHr: 80,
    }
    const mockFitBuffer = Buffer.from('mock-fit-data')
    const mockStravaResponse = {
      id: 12345,
      status: 'Your activity is being processed',
    }

    mockedGetServerSession.mockResolvedValue(mockSession)
    mockedGenerateFIT.mockReturnValue(mockFitBuffer)
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStravaResponse),
    } as Response)

    const request = new NextRequest(
      'http://localhost/api/workout/export/test',
      {
        method: 'POST',
        body: JSON.stringify(mockWorkoutData),
      }
    )

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.stravaResult).toEqual(mockStravaResponse)
    expect(mockedGenerateFIT).toHaveBeenCalledWith(mockWorkoutData)
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://www.strava.com/api/v3/uploads',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockSession.accessToken}`,
        },
      })
    )
  })

  it('should return error status if Strava upload fails', async () => {
    const mockSession = {
      accessToken: 'valid-strava-token',
      provider: 'strava',
    }
    const mockWorkoutData = {
      hrHistory: [{ time: 1000, hr: 80 }],
    }
    const mockFitBuffer = Buffer.from('mock-fit-data')
    const mockStravaError = { message: 'Invalid token' }

    mockedGetServerSession.mockResolvedValue(mockSession)
    mockedGenerateFIT.mockReturnValue(mockFitBuffer)
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve(mockStravaError),
    } as Response)

    const request = new NextRequest(
      'http://localhost/api/workout/export/test',
      {
        method: 'POST',
        body: JSON.stringify(mockWorkoutData),
      }
    )

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Failed to upload to Strava')
    expect(data.details).toEqual(mockStravaError)
  })

  it('should return 500 if an exception occurs', async () => {
    mockedGetServerSession.mockRejectedValue(new Error('Internal Server Error'))

    const request = new NextRequest(
      'http://localhost/api/workout/export/test',
      {
        method: 'POST',
        body: JSON.stringify({ hrHistory: [{ time: 1, hr: 1 }] }),
      }
    )

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('internal error occurred')
  })
})
