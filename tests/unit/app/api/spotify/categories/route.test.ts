/** @jest-environment node */

import { GET } from '@/app/api/spotify/categories/route'
import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'

jest.mock('next-auth/next')
jest.mock('@spotify/web-api-ts-sdk')

describe('/api/spotify/categories', () => {
  const mockGetServerSession = getServerSession as jest.Mock
  const mockSpotifyApi = SpotifyApi as jest.MockedClass<typeof SpotifyApi>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const response = await GET(new Request('http://localhost/'))
    expect(response.status).toBe(401)
  })

  it('should return fitness categories', async () => {
    mockGetServerSession.mockResolvedValue({ accessToken: 'test-token' })
    const mockGetCategories = jest.fn().mockResolvedValue({
      categories: {
        items: [
          { id: 'workout', name: 'Workout' },
          { id: 'running', name: 'Running' },
          { id: 'pop', name: 'Pop' },
          { id: 'rock', name: 'Rock' },
        ],
      },
    })
    mockSpotifyApi.withAccessToken.mockReturnValue({
      browse: {
        getCategories: mockGetCategories,
      },
    } as any)

    const response = await GET(new Request('http://localhost/'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.categories).toEqual([
      { id: 'workout', name: 'Workout' },
      { id: 'running', name: 'Running' },
      { id: 'pop', name: 'Pop' },
      { id: 'rock', name: 'Rock' },
    ])
  })
})
