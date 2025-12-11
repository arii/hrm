/** @jest-environment node */

import { GET } from '@/app/api/spotify/categories/[categoryId]/playlists/route'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'

jest.mock('next-auth/next')
jest.mock('@spotify/web-api-ts-sdk')

describe('/api/spotify/categories/[categoryId]/playlists', () => {
  const mockGetServerSession = getServerSession as jest.Mock
  const mockSpotifyApi = SpotifyApi as jest.MockedClass<typeof SpotifyApi>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const response = await GET(new Request('http://localhost/'), {
      params: { categoryId: 'workout' },
    })
    expect(response.status).toBe(401)
  })

  it('should return playlists for a category', async () => {
    mockGetServerSession.mockResolvedValue({ accessToken: 'test-token' })
    const mockGetCategoryPlaylists = jest.fn().mockResolvedValue({
      playlists: {
        items: [
          {
            id: '1',
            name: 'Workout Playlist',
            uri: 'spotify:playlist:1',
            description: 'A workout playlist',
            images: [{ url: 'http://example.com/image.jpg' }],
            tracks: { total: 10 },
            owner: { display_name: 'Spotify' },
          },
        ],
      },
    })
    mockSpotifyApi.withAccessToken.mockReturnValue({
      browse: {
        getCategoryPlaylists: mockGetCategoryPlaylists,
      },
    } as unknown as SpotifyApi)

    const response = await GET(new Request('http://localhost/'), {
      params: { categoryId: 'workout' },
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.playlists).toEqual([
      {
        id: '1',
        name: 'Workout Playlist',
        uri: 'spotify:playlist:1',
        description: 'A workout playlist',
        imageUrl: 'http://example.com/image.jpg',
        trackCount: 10,
        owner: 'Spotify',
      },
    ])
  })
})
