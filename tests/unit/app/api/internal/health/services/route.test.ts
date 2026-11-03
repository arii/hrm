/**
 * @jest-environment node
 */
import { GET } from '@/app/api/internal/health/services/route'

describe('/api/internal/health/services', () => {
  const originalSpotify = global.isSpotifyInitialized
  const originalTabata = global.tabataService

  afterEach(() => {
    global.isSpotifyInitialized = originalSpotify
    global.tabataService = originalTabata
  })

  it('reports healthy when all services initialized', async () => {
    global.isSpotifyInitialized = true
    global.tabataService = {} as never

    const response = await GET()
    const body = await response.json()

    expect(body.healthy).toBe(true)
    expect(body.details).toEqual({
      service: 'internal-services',
      spotifyInitialized: true,
      tabataInitialized: true,
    })
  })

  it('reports unhealthy when Spotify fell back to the stub', async () => {
    global.isSpotifyInitialized = false
    global.tabataService = {} as never

    const response = await GET()
    const body = await response.json()

    expect(body.healthy).toBe(false)
    expect(body.details.spotifyInitialized).toBe(false)
  })

  it('reports unhealthy when services never initialized', async () => {
    global.isSpotifyInitialized = undefined
    global.tabataService = undefined

    const response = await GET()
    const body = await response.json()

    expect(body.healthy).toBe(false)
  })
})
