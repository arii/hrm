// File: tests/unit/app/api/spotify/access-token/route.test.ts
import { GET } from '../../../../../../app/api/spotify/access-token/route'
import { serviceContainer } from '../../../../../../lib/serviceContainer'
import { SpotifyPolling } from '../../../../../../services/spotifyPolling'
import { NextRequest } from 'next/server'

jest.mock('../../../../../../services/spotifyPolling')

describe('GET /api/spotify/access-token', () => {
  let spotifyService: SpotifyPolling

  beforeEach(() => {
    spotifyService = new (SpotifyPolling as jest.Mock<SpotifyPolling>)()
    serviceContainer.register('spotifyService', spotifyService)
  })

  it('should return the access token from the spotify service', async () => {
    const request = new NextRequest('http://localhost/api/spotify/access-token')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
