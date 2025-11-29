/**
 * Unit tests for WebSocket manager
 * Tests state broadcasting and command routing through services
 */
// Mock dependencies first due to hoisting
jest.mock('ws')
jest.mock('../../services/spotifyPolling')
jest.mock('../../services/tabataTimer', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        handleCommand: jest.fn(),
        getState: jest.fn().mockReturnValue({ isRunning: false }),
    })),
}))


import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

describe('WebSocket Manager Integration', () => {
  let tabataTimer: any
  let spotifyService: any
  let wss: any
  let initSocketManager: any
  let TabataTimer: { mock: { calls: string | any[] } }
  let SpotifyPolling: { mock: { calls: string | any[] } }

  beforeEach(() => {
    jest.resetModules() // Reset modules to clear singleton states (like the broadcaster)

    // Re-import modules to get fresh instances with mocks
    const { WebSocketServer } = require('ws')
    SpotifyPolling = require('../../services/spotifyPolling').SpotifyPolling
    TabataTimer = require('../../services/tabataTimer').default
    initSocketManager = require('../../utils/socketManager').initSocketManager

    // Create fresh mocks for each test
    tabataTimer = new (TabataTimer as jest.Mock<any, any>)()
    spotifyService = new (SpotifyPolling as jest.Mock<any, any>)()
    wss = new (WebSocketServer as jest.Mock<any, any>)()

    // Initialize the manager with our mocked services
    initSocketManager(wss, { tabataService: tabataTimer, spotifyService })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Command Routing', () => {
    it('should route TIMER_COMMAND to TabataTimer', () => {
      const connectionHandler = wss.on.mock.calls.find(
        (call: any) => call[0] === 'connection'
      )?.[1]

      const mockWs = { on: jest.fn(), send: jest.fn() } // Add send mock
      connectionHandler(mockWs)

      const messageHandler = mockWs.on.mock.calls.find(
        (call: any) => call[0] === 'message'
      )?.[1]

      const message = JSON.stringify({
        type: 'TIMER_COMMAND',
        command: 'START'
      })
      messageHandler(message)

      expect(tabataTimer.handleCommand).toHaveBeenCalledWith('START')
    })

    it('should route SPOTIFY_COMMAND to SpotifyPolling', () => {
      const connectionHandler = wss.on.mock.calls.find(
        (call: any) => call[0] === 'connection'
      )?.[1]

      const mockWs = { on: jest.fn(), send: jest.fn() } // Add send mock
      connectionHandler(mockWs)

      const messageHandler = mockWs.on.mock.calls.find(
        (call: any) => call[0] === 'message'
      )?.[1]

      const message = JSON.stringify({
        type: 'SPOTIFY_COMMAND',
        command: 'PLAY',
        deviceId: 'd1'
      })
      messageHandler(message)

      expect(spotifyService.handleCommand).toHaveBeenCalledWith('PLAY', 'd1', undefined, undefined)
    })
  })
})
