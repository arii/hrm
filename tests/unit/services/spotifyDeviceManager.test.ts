import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyDeviceManager } from '../../../services/spotifyDeviceManager'
import { mockPlayer } from '../spotify-test-utils'
import { Devices, SpotifyApi } from '@spotify/web-api-ts-sdk'

// Mock the logger to prevent logs from appearing in test output
jest.mock('../../../utils/logger.server.js', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: require('../spotify-mocks').mockLogger,
}))

describe('SpotifyDeviceManager', () => {
  let deviceManager: SpotifyDeviceManager
  let sdk: SpotifyApi
  let broadcastMock: jest.Mock
  let getStateMock: jest.Mock
  let setStateMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    sdk = { player: mockPlayer } as unknown as SpotifyApi
    broadcastMock = jest.fn()
    getStateMock = jest.fn().mockReturnValue({
      devices: [],
    })
    setStateMock = jest.fn()

    deviceManager = new SpotifyDeviceManager(
      sdk,
      broadcastMock,
      getStateMock,
      setStateMock
    )
  })

  describe('refreshDevices', () => {
    it('should fetch and broadcast available devices', async () => {
      const mockDevices = {
        devices: [
          {
            id: 'device1',
            name: 'Speaker',
            type: 'Speaker',
            is_active: true,
            volume_percent: 50,
          },
          {
            id: 'device2',
            name: 'Laptop',
            type: 'Computer',
            is_active: false,
            volume_percent: 70,
          },
        ],
      }
      mockPlayer.getAvailableDevices.mockResolvedValue(mockDevices)

      await deviceManager.refreshDevices()

      expect(mockPlayer.getAvailableDevices).toHaveBeenCalledTimes(1)
      expect(setStateMock).toHaveBeenCalledWith(expect.any(Function))
      // It's better to test the outcome of the state update, not the function itself
      const setStateFunction = setStateMock.mock.calls[0][0]
      const newState = setStateFunction({ devices: [] })
      expect(newState.devices).toHaveLength(2)
      expect(newState.devices[0].id).toBe('device1')

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: { devices: expect.any(Array) },
      })
    })

    it('should handle errors during device fetch', async () => {
      const error = new Error('Failed to fetch devices')
      mockPlayer.getAvailableDevices.mockRejectedValue(error)

      await deviceManager.refreshDevices()

      expect(setStateMock).not.toHaveBeenCalled()
      expect(broadcastMock).not.toHaveBeenCalled()
      // You can also check if the error was logged if you mock the logger
    })

    it('should filter out devices with null IDs', async () => {
      const mockDevices = {
        devices: [
          { id: 'device1', name: 'Valid Device' },
          { id: null, name: 'Invalid Device' },
        ],
      }
      mockPlayer.getAvailableDevices.mockResolvedValue(
        mockDevices as unknown as Devices
      )

      await deviceManager.refreshDevices()

      const setStateFunction = setStateMock.mock.calls[0][0]
      const newState = setStateFunction({ devices: [] })
      expect(newState.devices).toHaveLength(1)
      expect(newState.devices[0].id).toBe('device1')
    })
  })
})
