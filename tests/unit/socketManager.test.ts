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
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import TabataTimer from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { StateSnapshot } from '../../types/websocket'
import { initSocketManager } from '../../utils/socketManager'
import * as broadcast from '../../utils/broadcast'
import * as ws from 'ws'

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

// Mock broadcaster to prevent side-effects between tests
jest.mock('../../utils/broadcast')
// Manual mock for the 'ws' module
jest.mock('ws')

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
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.clearAllMocks()
      // @ts-expect-error-next-line
      mockWss.clients.clear()
    })

    it('should set lastPingTime on new connection', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
      mockWss.emit('connection', mockWs) // Manually trigger connection event

      expect(mockWs.lastPingTime).toBeDefined()
      expect(mockWs.lastPingTime).toBeLessThanOrEqual(Date.now())
    })

    it('should update lastPingTime on PING message and respond with PONG', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
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
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
      mockWss.emit('connection', mockWs)

      // Do NOT simulate a ping. Advance time past the client inactivity timeout (120s)
      // and the watchdog interval (30s) to ensure the check that terminates runs.
      jest.advanceTimersByTime(150000)

      expect(mockWs.terminate).toHaveBeenCalledTimes(1)
    })

    it('should NOT terminate a client that is responsive', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
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

  describe('HRM Data Handling', () => {
    let mockWss: WebSocketServer
    let mockServices: {
      tabataService: TabataTimer
      spotifyService: SpotifyPolling
    }
    let getSnapshot: () => StateSnapshot
    let broadcastMock: jest.SpyInstance
    let localInitSocketManager: (
      wss: WebSocketServer,
      services: {
        tabataService: TabataTimer
        spotifyService: SpotifyPolling
      },
      getSnapshot: () => StateSnapshot
    ) => void

    beforeEach(() => {
      jest.resetModules()
      jest.useFakeTimers()

      mockWss = new (ws.Server as jest.Mock)()

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
      broadcastMock = jest.spyOn(broadcast, 'broadcast')
      localInitSocketManager =
        require('../../utils/socketManager').initSocketManager
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.clearAllMocks()
      // @ts-expect-error-next-line
      if (mockWss && mockWss.clients) {
        mockWss.clients.clear()
      }
    })

    it('should process HRM_INPUT, update client data, and broadcast the new metric', () => {
      localInitSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
      mockWss.emit('connection', mockWs)

      const hrmInputMessage = {
        type: 'HRM_INPUT',
        data: {
          value: 120,
          maxHr: 190,
          age: 35,
          name: 'Test User',
        },
      }

      const messageString = JSON.stringify(hrmInputMessage)
      mockWs.emit('message', messageString)

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'HRM_UPDATE',
        payload: [
          expect.objectContaining({
            clientId: expect.any(String),
            value: 120,
            timestamp: expect.any(Number),
          }),
        ],
      })
    })

    it('should broadcast the device list on new connection', () => {
      localInitSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
      mockWss.emit('connection', mockWs)

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'HRM_DEVICE_UPDATE',
        payload: [
          expect.objectContaining({
            clientId: expect.any(String),
          }),
        ],
      })
    })

    it('should broadcast the device list on disconnection', () => {
      localInitSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      // @ts-expect-error-next-line
      mockWss.clients.add(mockWs)
      // @ts-expect-error-next-line
      mockWss.emit('connection', mockWs)

      // Reset the mock to ignore the connection broadcast
      broadcastMock.mockClear()

      mockWs.emit('close')

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'HRM_DEVICE_UPDATE',
        payload: [],
      })
    })
  })
})
