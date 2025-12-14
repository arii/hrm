// @ts-nocheck
import { GET } from '../../../../../../app/api/spotify/devices/route'
import { SpotifyPolling } from '../../../../../../services/spotifyPolling'

jest.mock('../../../../../../services/spotifyPolling')

describe('GET /api/spotify/devices', () => {
  it('should return the list of devices', async () => {
    const mockDevices = [{ id: '1', name: 'Test Device' }]
    ;(
      SpotifyPolling.prototype.getDevices as jest.Mock
    ).mockResolvedValue(mockDevices)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockDevices)
  })
})
