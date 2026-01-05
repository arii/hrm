import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import {
  initSocketManager,
  resetSocketManager,
} from '../../utils/socketManager'
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import { broadcast } from '../../utils/websocketUtils.js'
import { createMockRequest } from './test-data/request-data-factory'

jest.mock('../../utils/websocketUtils.js', () => ({
  sendWebSocketMessage: jest.fn(),
  broadcast: jest.fn(),
  ConnectionMonitor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}))

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => {
    const wss = new EventEmitter() as jest.Mocked<WebSocketServer>
    wss.clients = new Set<MockWebSocket>()
    const originalOn = wss.on.bind(wss)
    const originalEmit = wss.emit.bind(wss)
    wss.on = jest.fn(
      (event: string, listener: (...args: unknown[]) => void) => {
        return originalOn(event, listener)
      }
    )
    wss.emit = jest.fn((event: string, ...args: unknown[]) => {
      return originalEmit(event, ...args)
    })
    return wss
  }),
  WebSocket: jest.fn(),
}))

class MockWebSocket extends EventEmitter {
  isAlive: boolean
  clientType: string | undefined
  clientId?: string
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()

  constructor() {
    super()
    this.isAlive = true
  }

  on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    super.on(event, listener)
    return this
  }
}

describe('WebSocket Manager Inactivity', () => {
  let mockWss: jest.Mocked<WebSocketServer>
  let mockServices: {
    tabataService: {
      getState: jest.Mock
    }
    spotifyService: {
      getState: jest.Mock
    }
  }
  let getSnapshot: jest.Mock
  let mockWs: MockWebSocket

  beforeEach(() => {
    jest.useFakeTimers()
    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>
    mockServices = {
      tabataService: {
        getState: jest.fn(),
      },
      spotifyService: {
        getState: jest.fn(),
      },
    }
    getSnapshot = jest.fn().mockReturnValue({})
    initSocketManager(mockWss, getSnapshot, mockServices)
    const mockReq = createMockRequest()
    mockWs = new MockWebSocket()
    ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
    mockWss.emit('connection', mockWs, mockReq)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    resetSocketManager()
  })

  it('should mark a client as stale after 10 seconds of inactivity', () => {
    // The monitor runs every 5s. The client is created at t=0.
    // At t=5s, inactive duration is 5s. Not stale.
    // At t=10s, inactive duration is 10s. Not stale (check is > 10s).
    // At t=15s, inactive duration is 15s. IS stale.
    jest.advanceTimersByTime(15 * 1000)
    expect(broadcast).toHaveBeenCalledWith(
      mockWss,
      expect.objectContaining({
        payload: expect.arrayContaining([
          expect.objectContaining({
            isStale: true,
          }),
        ]),
      }),
      'socketManager.broadcastState'
    )
  })

  it("should remove a client's stale status when new data is received", () => {
    // First, make the client stale.
    jest.advanceTimersByTime(15 * 1000)
    expect(broadcast).toHaveBeenCalledWith(
      mockWss,
      expect.objectContaining({
        payload: expect.arrayContaining([
          expect.objectContaining({
            isStale: true,
          }),
        ]),
      }),
      'socketManager.broadcastState'
    )

    // Then, simulate receiving a message. This should immediately broadcast a non-stale state.
    const message = JSON.stringify({
      type: 'HRM_INPUT',
      data: { value: 120 },
    })
    mockWs.emit('message', message.toString())

    expect(broadcast).toHaveBeenLastCalledWith(
      mockWss,
      expect.objectContaining({
        payload: expect.arrayContaining([
          expect.objectContaining({
            isStale: false,
          }),
        ]),
      }),
      'socketManager.broadcastState'
    )
  })

  it('should remove a client after 60 seconds of inactivity', () => {
    // The monitor runs every 5s. The client is created at t=0.
    // At t=60s, inactive duration is 60s. Not removed (check is > 60s).
    // At t=65s, inactive duration is 65s. IS removed.
    jest.advanceTimersByTime(65 * 1000)
    // The broadcast after removal should contain an empty payload.
    expect(broadcast).toHaveBeenCalledWith(
      mockWss,
      expect.objectContaining({
        payload: [],
      }),
      'socketManager.broadcastState'
    )
  })
})
