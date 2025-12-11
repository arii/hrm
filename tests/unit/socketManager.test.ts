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
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import TabataTimer from '../../services/tabataTimer'
import { ServerMessage } from '../../types/websocket'
import { initSocketManager } from '../../utils/socketManager'
import { WebSocket, Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'

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
    // @ts-ignore
    wss.clients = new Set()
    // @ts-ignore
    wss.on = jest.fn(wss.on.bind(wss))
    // @ts-ignore
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
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener)
    return this
  }
}

describe('WebSocket Manager', () => {
  describe('Heartbeat and Watchdog', () => {
    let mockWss: WebSocketServer
    let mockServices: any
    let getSnapshot: any

    beforeEach(() => {
      jest.useFakeTimers()
      mockWss = new (WebSocketServer as jest.Mock)()
      mockServices = {
        tabataService: { handleCommand: jest.fn(), setMode: jest.fn() },
        spotifyService: { handleCommand: jest.fn() },
      }
      getSnapshot = jest.fn()
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.clearAllMocks()
      // @ts-ignore
      mockWss.clients.clear()
    })

    it('should set lastPingTime on new connection', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-ignore
      mockWss.clients.add(mockWs)
      // @ts-ignore
      mockWss.emit('connection', mockWs) // Manually trigger connection event

      expect(mockWs.lastPingTime).toBeDefined()
      expect(mockWs.lastPingTime).toBeLessThanOrEqual(Date.now())
    })

    it('should update lastPingTime on PING message and respond with PONG', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-ignore
      mockWss.clients.add(mockWs)
      // @ts-ignore
      mockWss.emit('connection', mockWs)

      const initialPingTime = mockWs.lastPingTime
      jest.advanceTimersByTime(1000)

      // Simulate a PING message from the client
      const message = JSON.stringify({ type: 'PING' })
      mockWs.emit('message', message.toString())

      expect(mockWs.lastPingTime).toBeGreaterThan(initialPingTime!)
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'PONG' }))
    })

    it('should terminate a client if no ping is received within the timeout', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-ignore
      mockWss.clients.add(mockWs)
      // @ts-ignore
      mockWss.emit('connection', mockWs)

      // Do NOT simulate a ping. Advance time past the client inactivity timeout (120s)
      // and the watchdog interval (30s) to ensure the check that terminates runs.
      jest.advanceTimersByTime(150000)

      expect(mockWs.terminate).toHaveBeenCalledTimes(1)
    })

    it('should NOT terminate a client that is responsive', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-ignore
      mockWss.clients.add(mockWs)
      // @ts-ignore
      mockWss.emit('connection', mockWs)

      // Simulate responsiveness by sending pings
      const interval = setInterval(() => {
        const message = JSON.stringify({ type: 'PING' })
        mockWs.emit('message', message.toString())
      }, 25000) // Send a ping every 25 seconds

      jest.advanceTimersByTime(150000) // Advance well past the timeout

      expect(mockWs.terminate).not.toHaveBeenCalled()
      clearInterval(interval)
    })
  })
})
