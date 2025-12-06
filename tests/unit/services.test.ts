/**
 * Unit tests for WebSocket manager
 * Tests state broadcasting and command routing through services
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import TabataTimer from '../../services/tabataTimer'
import { ServerMessage } from '../../types/websocket'
import { initSocketManager } from '../../utils/socketManager'
import { Server as WebSocketServer, WebSocket } from 'ws'

// Mock dependencies
jest.mock('../../services/spotifyPolling')
jest.mock('../../services/tabataTimer')

describe('Services Integration', () => {
  let wss: WebSocketServer
  let tabataService: jest.Mocked<TabataTimer>
  let spotifyService: jest.Mocked<SpotifyPolling>
  let broadcastedMessages: Partial<ServerMessage>[] = []
  let mockSdk: any

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    // Create broadcast function that collects messages
    const broadcastFn = (data: Partial<ServerMessage>) => {
      broadcastedMessages.push(data)
    }

    // Mock SDK instance
    mockSdk = {
      player: {
        setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
        startResumePlayback: jest.fn().mockResolvedValue(undefined),
        skipToNext: jest.fn().mockResolvedValue(undefined),
        pausePlayback: jest.fn().mockResolvedValue(undefined),
      },
    }

    // Since we're mocking the class, we can provide a mock implementation for the instance
    spotifyService = new (SpotifyPolling as jest.Mock<any>)(broadcastFn, 'test-user-id')
    spotifyService.handleCommand = jest.fn()
    // Directly attach the mock SDK to the mocked service instance
    ;(spotifyService as any).sdk = mockSdk

    tabataService = new (TabataTimer as jest.Mock<any>)(broadcastFn)
    tabataService.handleCommand = jest.fn()
    tabataService.getState = jest.fn().mockReturnValue({ isRunning: false })

    wss = new WebSocketServer({ noServer: true })

    initSocketManager(
      wss,
      { tabataService, spotifyService },
      () =>
        ({
          timerData: tabataService.getState(),
          spotifyData: spotifyService.getState(),
        } as any)
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should handle incoming messages', () => {
    const ws = new WebSocket('ws://localhost')
    wss.emit('connection', ws)
    ws.emit('message', JSON.stringify({ type: 'GET_STATE' }))
    // Add assertions here if needed
  })
})
