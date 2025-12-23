// File: tests/unit/app/api/spotify/control/route.test.ts
import { POST } from '../../../../../../app/api/spotify/control/route'
import { serviceContainer } from '../../../../../../lib/serviceContainer'
import { SpotifyPolling } from '../../../../../../services/spotifyPolling'
import { NextRequest } from 'next/server'

jest.mock('../../../../../../services/spotifyPolling')

describe('POST /api/spotify/control', () => {
  let spotifyService: SpotifyPolling

  beforeEach(() => {
    spotifyService = new (SpotifyPolling as jest.Mock<SpotifyPolling>)()
    serviceContainer.register('spotifyService', spotifyService)
  })

  it('should call the spotify service with the correct command', async () => {
    const request = new NextRequest('http://localhost/api/spotify/control', {
      method: 'POST',
      body: JSON.stringify({ command: 'PLAY' }),
    })
    await POST(request)
    expect(spotifyService.handleCommand).toHaveBeenCalledWith('PLAY', undefined, undefined)
  })
})
