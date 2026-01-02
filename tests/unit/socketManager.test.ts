// File: tests/unit/socketManager.test.ts
import { WebSocket, Server as WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import { initSocketManager } from '../../utils/socketManager'
import { HrmInputMessage, HrmData } from '../../types/websocket'
import { Socket } from 'net'

// Increase timeout for this test file due to async nature of WebSocket tests
jest.setTimeout(30000)

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

jest.mock('../../lib/env', () => ({
  env: {
    WEBSOCKET_GRACE_PERIOD_MS: 100,
  },
}))

describe('WebSocket Manager', () => {
  let wss: WebSocketServer
  let mockGetSnapshot: jest.Mock
  let mockServices: {
    tabataService: {
      handleCommand: jest.Mock
      setMode: jest.Mock
      setConfig: jest.Mock
    }
    spotifyService: {
      handleCommand: jest.Mock
    }
  }

  beforeEach(() => {
    wss = new WebSocketServer({ noServer: true })
    mockGetSnapshot = jest.fn().mockReturnValue({})
    mockServices = {
      tabataService: {
        handleCommand: jest.fn(),
        setMode: jest.fn(),
        setConfig: jest.fn(),
      },
      spotifyService: {
        handleCommand: jest.fn(),
      },
    }
    initSocketManager(wss, mockGetSnapshot, mockServices)
  })

  afterEach(() => {
    wss.close()
  })

  const createMockSocket = (): WebSocket => {
    const ws = new WebSocket('ws://localhost:8080')
    Object.defineProperty(ws, 'readyState', {
      value: WebSocket.OPEN,
      writable: true,
    })
    return ws as WebSocket
  }

  const createMockRequest = (clientId: string): IncomingMessage => {
    const req = new IncomingMessage(new Socket())
    req.headers = { host: 'localhost' }
    req.url = `/?clientId=${clientId}`
    return req
  }

  it('should handle a new connection', () => {
    const ws = createMockSocket()
    const req = createMockRequest('test-client-1')
    wss.emit('connection', ws, req)
    expect(ws).toHaveProperty('clientId', 'test-client-1')
  })

  it('should handle HRM_INPUT and broadcast state', async () => {
    const ws1 = createMockSocket()
    const req1 = createMockRequest('client-1')
    wss.emit('connection', ws1, req1)

    const ws2 = createMockSocket()
    const req2 = createMockRequest('client-2')
    wss.emit('connection', ws2, req2)

    const hrmMessage: HrmInputMessage = {
      type: 'HRM_INPUT',
      data: { value: 150, calories: 123.4 },
    }

    ws2.on('message', (data) => {
      const message = JSON.parse(data.toString())
      if (message.type === 'HRM_UPDATE') {
        const client1Data = message.payload.find(
          (d: HrmData) => d.clientId === 'client-1'
        )
        expect(client1Data.value).toBe(150)
        expect(client1Data.calories).toBe(123.4)
        done()
      }
    })

    ws1.emit('message', JSON.stringify(hrmMessage))
  })
})
