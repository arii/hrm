// File: tests/unit/socketManager.test.ts
/**
 * Test suite for WebSocket manager (socketManager.ts)
 */
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { initSocketManager } from '../../utils/socketManager'
import { TabataTimer } from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { ServerMessage } from '../../types/websocket'

// Mock dependencies
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    terminate: jest.fn(),
  })),
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    clients: new Set(),
    emit: jest.fn(),
  })),
}))
jest.mock('../../services/tabataTimer')
jest.mock('../../services/spotifyPolling')

const mockWebSocketServer = new WebSocketServer()

describe('WebSocket Manager Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let mockSocket: WebSocket

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    // Create new mock instances for each test
    tabataTimer = new (TabataTimer as jest.Mock<any, any>)(jest.fn())
    spotifyService = new (SpotifyPolling as jest.Mock<any, any>)(jest.fn())
    mockSocket = new (WebSocket as jest.Mock<any, any>)('')
    // Ensure clients set is always fresh
    mockWebSocketServer.clients.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize and attach listeners on new connection', () => {
    const getSnapshot = jest.fn()
    initSocketManager(
      mockWebSocketServer,
      { tabataService: tabataTimer, spotifyService: spotifyService },
      getSnapshot
    )
    const mockRequest = {} as IncomingMessage
    mockWebSocketServer.emit('connection', mockSocket, mockRequest)
    expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function))
  })

  it('should send INITIAL_STATE on new connection', () => {
    const mockSnapshot = {
      timerData: { isRunning: false },
      spotifyData: { isPlaying: false },
    }
    const getSnapshot = jest.fn().mockReturnValue(mockSnapshot)
    initSocketManager(
      mockWebSocketServer,
      { tabataService: tabataTimer, spotifyService: spotifyService },
      getSnapshot
    )
    const mockRequest = {} as IncomingMessage
    mockWebSocketServer.emit('connection', mockSocket, mockRequest)
    const expectedMessage = JSON.stringify({
      type: 'INITIAL_STATE',
      payload: { ...mockSnapshot, hrmData: [] },
    })
    expect(mockSocket.send).toHaveBeenCalledWith(expectedMessage)
  })

  it('should handle incoming TIMER_COMMAND', () => {
    const getSnapshot = jest.fn()
    initSocketManager(
      mockWebSocketServer,
      { tabataService: tabataTimer, spotifyService: spotifyService },
      getSnapshot
    )
    const mockRequest = {} as IncomingMessage
    mockWebSocketServer.emit('connection', mockSocket, mockRequest)
    const messageHandler = (mockSocket.on as jest.Mock).mock.calls.find(
      (call) => call[0] === 'message'
    )[1]
    messageHandler(
      JSON.stringify({ type: 'TIMER_COMMAND', command: 'START' })
    )
    expect(tabataTimer.handleCommand).toHaveBeenCalledWith('START')
  })
})
