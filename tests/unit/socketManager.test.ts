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
import { initSocketManager } from '../../utils/socketManager'
import EventEmitter from 'events'
import { WebSocketServer } from 'ws'

// Mock the services
jest.mock('../../services/spotifyPolling')
jest.mock('../../services/tabataTimer')

class MockWebSocket extends EventEmitter {
  send = jest.fn()
  close = jest.fn()
  readyState = 1 // OPEN
}

describe('WebSocket Manager Integration', () => {
  let mockWss: EventEmitter
  let mockTabataService: jest.Mocked<TabataTimer>
  let mockSpotifyService: jest.Mocked<SpotifyPolling>
  let getFullState: jest.Mock
  let mockWs: MockWebSocket

  beforeEach(() => {
    mockWss = new EventEmitter()
    mockWs = new MockWebSocket()

    // Instantiate mocked services
    mockTabataService = new (TabataTimer as jest.Mock<typeof TabataTimer>)()
    mockSpotifyService = new (SpotifyPolling as jest.Mock<
      typeof SpotifyPolling
    >)()

    // Define mock methods
    mockTabataService.handleCommand = jest.fn()
    mockTabataService.getState = jest.fn().mockReturnValue({ isRunning: false })

    mockSpotifyService.handleCommand = jest.fn()
    mockSpotifyService.getState = jest.fn().mockReturnValue({ isPlaying: false })
    mockSpotifyService.isReady = jest.fn().mockReturnValue(true)

    getFullState = jest.fn().mockReturnValue({
      timerData: {},
      spotifyData: {},
      spotifyServiceInitialized: true,
    })

    initSocketManager(
      mockWss as WebSocketServer,
      {
        tabataService: mockTabataService,
        spotifyService: mockSpotifyService,
      },
      getFullState
    )

    // Simulate a client connection
    mockWss.emit('connection', mockWs, {})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should route TIMER_COMMAND to TabataTimer service', () => {
    const message = {
      type: 'TIMER_COMMAND',
      payload: { command: 'START' },
    }
    mockWs.emit('message', Buffer.from(JSON.stringify(message)))
    expect(mockTabataService.handleCommand).toHaveBeenCalledWith('START')
    expect(mockSpotifyService.handleCommand).not.toHaveBeenCalled()
  })

  it('should route SPOTIFY_COMMAND to SpotifyPolling service', () => {
    const message = {
      type: 'SPOTIFY_COMMAND',
      payload: { command: 'PLAY', deviceId: 'test-device' },
    }
    mockWs.emit('message', Buffer.from(JSON.stringify(message)))
    expect(mockSpotifyService.handleCommand).toHaveBeenCalledWith(
      'PLAY',
      'test-device',
      undefined
    )
    expect(mockTabataService.handleCommand).not.toHaveBeenCalled()
  })
})
