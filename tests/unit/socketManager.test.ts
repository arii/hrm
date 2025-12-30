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
import {
  initSocketManager,
  resetSocketManager,
} from '../../utils/socketManager'
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import {
  StateSnapshot,
  ExtWebSocket,
} from '../../types/websocket'
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from '../../utils/websocketUtils.js'
import logger from '@/utils/logger'
import redisClient from '../../lib/redis'
import { AppServices } from '@/lib/services'
import { IncomingMessage } from 'http'

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

// Mock ConnectionMonitor and other utils
jest.mock('../../utils/websocketUtils.js', () => ({
  sendWebSocketMessage: jest.fn(),
  broadcast: jest.fn(),
  ConnectionMonitor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}))

// Mock logger globally for the test file
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Manual mock for the 'ws' module
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
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()
  clientId: string
  readyState: number

  constructor(clientId = `user-${Math.random().toString(36).substring(2, 9)}`) {
    super()
    this.isAlive = true
    this.clientId = clientId
    this.readyState = 1 // WebSocket.OPEN
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

const mockRedis = redisClient as jest.Mocked<typeof redisClient>

describe('WebSocket Manager', () => {
  let mockWss: jest.Mocked<WebSocketServer>
  let mockServices: jest.Mocked<AppServices>
  let getSnapshot: () => StateSnapshot
  let connectionHandler: (ws: MockWebSocket, req: Partial<IncomingMessage>) => void

  beforeEach(() => {
    jest.useFakeTimers()
    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>

    mockServices = {
      tabataService: {
        handleCommand: jest.fn(),
        setMode: jest.fn(),
        setConfig: jest.fn(),
      } as any,
      spotifyService: {
        handleCommand: jest.fn(),
      } as any,
    }

    getSnapshot = jest.fn().mockReturnValue({
      timerData: {},
      spotifyData: {},
      spotifyServiceInitialized: true,
    })

    initSocketManager(mockWss, getSnapshot, mockServices)

    connectionHandler = mockWss.on.mock.calls.find(
        (call) => call[0] === 'connection'
    )?.[1]
  })

  afterEach(async () => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    await resetSocketManager()
  })

  const connectClient = async (ws: MockWebSocket) => {
    (mockWss.clients as Set<MockWebSocket>).add(ws)
    await connectionHandler(ws, {
      url: `/?clientId=${ws.clientId}`,
      headers: { host: 'localhost' },
    })
  }

  describe('Connection Logic', () => {
    it('should initialize a new client if one does not exist', async () => {
      const newWs = new MockWebSocket('new-client')
      await connectClient(newWs)

      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'hrm-data:new-client',
        expect.any(Object)
      )
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'session-state:new-client',
        expect.any(Object)
      )
    })

    it('should reconnect an existing client without creating new data', async () => {
      const existingData = { clientId: 'existing-client', value: '120' }
      mockRedis.hGetAll.mockResolvedValueOnce(existingData)
      const newWs = new MockWebSocket('existing-client')

      await connectClient(newWs)

      expect(mockRedis.hSet).not.toHaveBeenCalled()
    })

    it('should handle client disconnect and cleanup after grace period', async () => {
      const ws = new MockWebSocket('test-client-1')
      await connectClient(ws)
      ws.emit('close')

      await jest.runAllTimersAsync()

      expect(mockRedis.del).toHaveBeenCalledWith('hrm-data:test-client-1')
      expect(mockRedis.del).toHaveBeenCalledWith('session-state:test-client-1')
      expect(broadcast).toHaveBeenCalled()
    })
  })

  describe('Message Handling', () => {
    let mockWs: MockWebSocket;

    beforeEach(async () => {
        mockWs = new MockWebSocket('test-client-1');
        await connectClient(mockWs);
        jest.clearAllMocks(); // Clear mocks after initial connection
    });

    it('should handle REGISTER_CLIENT message', async () => {
      const message = JSON.stringify({
        type: 'REGISTER_CLIENT',
        role: 'dashboard',
      })
      mockWs.emit('message', message)
      await jest.runAllTimersAsync();

      const extWs = mockWs as ExtWebSocket
      expect(extWs.clientType).toBe('dashboard')
    })

    it('should send initial state on GET_STATE message', async () => {
      const message = JSON.stringify({ type: 'GET_STATE' })
      mockWs.emit('message', message)
      await jest.runAllTimersAsync();

      expect(getSnapshot).toHaveBeenCalled()
      expect(sendWebSocketMessage).toHaveBeenCalled()
    })

    it('should handle HRM_METADATA_UPDATE', async () => {
      const message = JSON.stringify({
        type: 'HRM_METADATA_UPDATE',
        data: { name: 'New Name', maxHr: 190 },
      });

      mockRedis.hGetAll.mockResolvedValue({ clientId: 'test-client-1' });
      mockWs.emit('message', message);
      await jest.runAllTimersAsync();

      expect(mockRedis.hSet).toHaveBeenCalledWith('hrm-data:test-client-1', expect.objectContaining({
        name: 'New Name',
        maxHr: '190'
      }));
    });

    it('should handle HRM_INPUT and calculate calories', async () => {
      const message = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 150 },
      });

      mockRedis.hGetAll.mockResolvedValue({ clientId: 'test-client-1' });
      mockWs.emit('message', message);
      await jest.runAllTimersAsync();

      expect(mockRedis.hSet).toHaveBeenCalledWith('hrm-data:test-client-1', expect.objectContaining({
        value: '150'
      }));
    });

    it('should handle invalid JSON gracefully', async () => {
      mockWs.emit('message', 'invalid json')
      await jest.runAllTimersAsync();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'test-client-1' }),
        'Error processing incoming message'
      )
    })

    it('should handle Zod validation errors gracefully', async () => {
      const message = JSON.stringify({ type: 'INVALID_TYPE' })
      mockWs.emit('message', message)
      await jest.runAllTimersAsync();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'test-client-1' }),
        'WebSocket message validation failed'
      )
    })
  })
})
