// @ts-nocheck
import { POST } from '../../../../../../app/api/spotify/control/route'
import { SpotifyPolling } from '../../../../../../services/spotifyPolling'
import { NextRequest } from 'next/server'

jest.mock('../../../../../../services/spotifyPolling')

describe('POST /api/spotify/control', () => {
  let req: Partial<NextRequest>

  beforeEach(() => {
    req = {
      json: jest.fn(),
    }
    jest.clearAllMocks()
  })

  it('should return 400 if action is missing', async () => {
    ;(req.json as jest.Mock).mockResolvedValue({})
    const response = await POST(req as NextRequest)
    expect(response.status).toBe(400)
  })

  it('should call handleCommand with the correct parameters', async () => {
    const mockAction = {
      type: 'PLAY',
      deviceId: 'test-device',
      contextUri: 'test-uri',
    }
    ;(req.json as jest.Mock).mockResolvedValue(mockAction)

    const response = await POST(req as NextRequest)

    expect(SpotifyPolling.prototype.handleCommand).toHaveBeenCalledWith(
      mockAction.type,
      {
        deviceId: mockAction.deviceId,
        contextUri: mockAction.contextUri,
      }
    )
    expect(response.status).toBe(200)
  })
})
