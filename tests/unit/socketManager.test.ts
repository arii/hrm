/**
 * @jest-environment node
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { initSocketManager } from '../../utils/socketManager'
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import TabataTimer from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { StateSnapshot } from '../../types/websocket'

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

// Mock broadcaster to prevent side-effects between tests
jest.mock('../../utils/broadcast', () => ({
  initBroadcaster: jest.fn(),
  broadcast: jest.fn(),
}))

// Manual mock for the 'ws' module
jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => {
    const wss = new EventEmitter()
    // @ts-expect-error-next-line
    wss.clients = new Set()
    // @ts-expect-error-next-line
    wss.on = jest.fn(wss.on.bind(wss))
    // @ts-expect-error-next-line
    wss.emit = jest.fn(wss.emit.bind(wss))
    return wss
  }),
  WebSocket: jest.fn(),
}))

class MockWebSocket extends EventEmitter {
  lastPingTime: number | undefined
  clientType: string | undefined
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()

  constructor() {
    super()
    this.lastPingTime = Date.now()
  }

  // Simulate receiving a pong from the client
  receivePong() {
    this.emit('pong')
  }

  // Override 'on' to correctly handle our event emitter
  on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    super.on(event, listener)
    return this
  }
}

describe('WebSocket Manager', () => {
  describe('Heartbeat and Watchdog', () => {
    let mockWss: WebSocketServer
    let mockServices: {
      tabataService: TabataTimer
      spotifyService: SpotifyPolling
    }
    let getSnapshot: () => StateSnapshot
    let setIntervalSpy: jest.SpiedFunction<typeof setInterval>
    let watchdogCallback: () => void

    beforeEach(() => {
      jest.useFakeTimers()
      mockWss = new (WebSocketServer as jest.Mock)()
      mockServices = {
        tabataService: {
          handleCommand: jest.fn(),
          setMode: jest.fn(),
        } as unknown as TabataTimer,
        spotifyService: {
          handleCommand: jest.fn(),
        } as unknown as SpotifyPolling,
      }
      getSnapshot = jest.fn()

      // Spy on setInterval and capture the callback
      setIntervalSpy = jest.spyOn(global, 'setInterval')
      initSocketManager(mockWss, mockServices, getSnapshot)

      // Capture the watchdog callback
      if (setIntervalSpy.mock.calls.length > 0) {
        watchdogCallback = setIntervalSpy.mock.calls[0][0] as () => void
      }
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.clearAllMocks()
      // @ts-expect-error-next-line
      mockWss.clients.clear()
      setIntervalSpy.mockRestore()
    })

    it('should set lastPingTime on new connection', () => {
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
      mockWss.emit('connection', mockWs)

      expect(mockWs.lastPingTime).toBeDefined()
      expect(mockWs.lastPingTime).toBeLessThanOrEqual(Date.now())
    })

    it('should update lastPingTime on PING message and respond with PONG', () => {
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
      mockWss.emit('connection', mockWs)

      const initialPingTime = mockWs.lastPingTime
      jest.advanceTimersByTime(1000)

      const message = JSON.stringify({ type: 'PING' })
      mockWs.emit('message', message.toString())

      expect(mockWs.lastPingTime).toBeGreaterThan(initialPingTime!)
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'PONG' }))
    })

    it('should terminate a client if no ping is received within the timeout', () => {
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
      mockWss.emit('connection', mockWs)

      // Advance time but don't simulate a ping
      jest.advanceTimersByTime(150000)

      // Manually trigger the watchdog ONLY ONCE
      if (watchdogCallback) {
        watchdogCallback()
      }

      expect(mockWs.terminate).toHaveBeenCalledTimes(1)
    })

    it('should NOT terminate a client that is responsive', () => {
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
      mockWss.emit('connection', mockWs)

      // Simulate a ping to show responsiveness
      const message = JSON.stringify({ type: 'PING' })
      mockWs.emit('message', message.toString())

      // Advance time
      jest.advanceTimersByTime(150000)

      // Manually trigger the watchdog
      if (watchdogCallback) {
        watchdogCallback()
      }

      expect(mockWs.terminate).not.toHaveBeenCalled()
    })
  })
})
