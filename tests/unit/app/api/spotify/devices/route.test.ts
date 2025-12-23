// File: tests/unit/app/api/spotify/devices/route.test.ts
import { GET } from '../../../../../../app/api/spotify/devices/route'
import { serviceContainer } from '../../../../../../lib/serviceContainer'
import { SpotifyPolling } from '../../../../../../services/spotifyPolling'
import { NextRequest } from 'next/server'

jest.mock('../../../../../../services/spotifyPolling')

describe('GET /api/spotify/devices', () => {
  let spotifyService: SpotifyPolling

  beforeEach(() => {
    spotifyService = new (SpotifyPolling as jest.Mock<SpotifyPolling>)()
    serviceContainer.register('spotifyService', spotifyService)
  })

  it('should return the devices from the spotify service', async () => {
    const request = new NextRequest('http://localhost/api/spotify/devices')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
