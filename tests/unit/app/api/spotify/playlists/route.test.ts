/**
 * @jest-environment jsdom
 */
import { GET } from '@/app/api/spotify/playlists/route'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'

jest.mock('next-auth/next')
jest.mock('@spotify/web-api-ts-sdk')
jest.mock('@/lib/middleware/errorHandler')

const mockGetServerSession = getServerSession as jest.Mock
const mockSpotifyApi = SpotifyApi as jest.Mocked<typeof SpotifyApi>
const mockWithErrorHandler = withErrorHandler as jest.Mock

// Mock implementation of withErrorHandler that just returns the handler
mockWithErrorHandler.mockImplementation((handler) => handler)

describe('GET /api/spotify/playlists', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return a list of playlists', async () => {
    mockGetServerSession.mockResolvedValue({ accessToken: 'test-token' })
    const mockPlaylists = { items: [{ id: '1', name: 'Test Playlist' }] }
    const mockSdk = {
      currentUser: {
        playlists: {
          playlists: jest.fn().mockResolvedValue(mockPlaylists),
        },
      },
    }
    mockSpotifyApi.withAccessToken.mockReturnValue(mockSdk as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockPlaylists)
  })

  it('should return a 401 error if there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return a 500 error if there is an error fetching playlists', async () => {
    mockGetServerSession.mockResolvedValue({ accessToken: 'test-token' })
    const mockSdk = {
      currentUser: {
        playlists: {
          playlists: jest.fn().mockRejectedValue(new Error('Test Error')),
        },
      },
    }
    mockSpotifyApi.withAccessToken.mockReturnValue(mockSdk as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Test Error')
  })
})
