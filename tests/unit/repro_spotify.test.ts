
// Reproduction test for Spotify control route deviceId handling
import { POST } from '@/app/api/spotify/control/route'
import { getServerSession } from 'next-auth/next'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { AccessToken } from 'next-auth/jwt'

// Mock 'next-auth/next'
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock the Spotify SDK
jest.mock('@spotify/web-api-ts-sdk', () => {
  const mockPlayer = {
    startResumePlayback: jest.fn(),
    pausePlayback: jest.fn(),
    setPlaybackVolume: jest.fn(),
  }
  return {
    SpotifyApi: {
      withAccessToken: jest.fn(() => ({
        player: mockPlayer,
      })),
    },
  }
})

const mockedGetServerSession = getServerSession as jest.Mock
const mockedSpotifyApi = SpotifyApi as jest.Mocked<typeof SpotifyApi>
const mockSdk = mockedSpotifyApi.withAccessToken('test-client', {} as AccessToken)
const mockPlayer = mockSdk.player as jest.Mocked<typeof mockSdk.player>

describe('Reproduction: deviceId handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetServerSession.mockResolvedValue({
      accessToken: { access_token: 'fake' }
    })
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
  })

  it('passes undefined when deviceId is missing', async () => {
    const req = new Request('http://localhost/api/spotify/control', {
      method: 'POST',
      body: JSON.stringify({ command: 'PAUSE' }), // No deviceId
    })
    await POST(req)
    expect(mockPlayer.pausePlayback).toHaveBeenCalledWith(undefined)
  })
})
