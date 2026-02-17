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
    warn: jest.fn(),
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

  it('should return 400 if no heart rate data is provided', async () => {
    mockedGetServerSession.mockResolvedValue({
      accessToken: 'token',
      provider: 'spotify',
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
    expect(data.error).toContain('Invalid workout data')
  })

  it('should successfully generate and download FIT file', async () => {
    const mockSession = {
      accessToken: 'valid-token',
      provider: 'spotify',
    }
    const mockWorkoutData = {
      hrHistory: [{ time: 1000, hr: 80 }],
      averageHr: 80,
      startTime: 1000,
      maxHr: 120,
      totalCaloriesBurned: 50,
    }
    const mockFitBuffer = Buffer.from('mock-fit-data')

    mockedGetServerSession.mockResolvedValue(mockSession)
    mockedGenerateFIT.mockReturnValue(mockFitBuffer)

    const request = new NextRequest(
      'http://localhost/api/workout/export/test',
      {
        method: 'POST',
        body: JSON.stringify(mockWorkoutData),
      }
    )

    const response = await POST(request, context)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
    expect(response.headers.get('Content-Disposition')).toContain(`attachment; filename="workout_${sessionId}.fit"`)

    const buffer = await response.arrayBuffer()
    expect(Buffer.from(buffer).toString()).toBe('mock-fit-data')

    expect(mockedGenerateFIT).toHaveBeenCalledWith(mockWorkoutData)
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
