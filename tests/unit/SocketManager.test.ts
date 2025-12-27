/**
 * @jest-environment node
 */
import { SocketManager } from '@/utils/socketManager'
import { HrmDataRepository } from '@/lib/repositories/HrmDataRepository'
import { WebSocketServer, WebSocket } from 'ws'
import { HrmStreamData, AppServices } from '@/types'
import { logger } from '@/utils/logger'
import * as websocketUtils from '@/utils/websocketUtils'
import { EventEmitter } from 'events'

// Mock dependencies
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => new MockWebSocket()),
  WebSocketServer: jest.fn().mockImplementation(() => {
    const wss = new EventEmitter()
    ;(wss as any).clients = new Set()
    return wss
  }),
}))
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))
jest.mock('@/lib/repositories/HrmDataRepository')
jest.mock('@/utils/websocketUtils')

const RECONNECT_GRACE_PERIOD = 5000

// Custom mock for WebSocket
class MockWebSocket extends EventEmitter {
  isAlive = true
  clientId: string = ''
  ping = jest.fn()
  terminate = jest.fn()
  send = jest.fn()
}

describe('SocketManager', () => {
  let mockWss: WebSocketServer
  let socketManager: SocketManager
  let mockRepository: jest.Mocked<HrmDataRepository>
  let mockServices: AppServices

  beforeAll(() => {
    jest.useFakeTimers()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockWss = new WebSocketServer()
    mockRepository = new HrmDataRepository() as jest.Mocked<HrmDataRepository>
    mockServices = {} as AppServices // Add mock services if needed
    socketManager = new SocketManager(mockWss, mockServices)
    // Replace the instance's repository with our mocked one
    ;(socketManager as any).hrmDataRepository = mockRepository
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  const connectClient = (
    clientId: string,
    url: string = 'ws://localhost'
  ) => {
    const ws = new MockWebSocket()
    ws.clientId = clientId
    mockWss.clients.add(ws as any)
    // Manually attach listeners that the real 'ws' library would
    ws.on = jest.fn((event, callback) => {
      ws.addListener(event, callback)
    })
    mockWss.emit('connection', ws, { url: `${url}?clientId=${clientId}` })
    return ws
  }

  describe('Connection Handling', () => {
    it('should set up ping-pong keep-alive', () => {
      const ws = connectClient('client-1')
      jest.advanceTimersByTime(30000)
      expect(ws.ping).toHaveBeenCalled()
      ws.isAlive = false
      ws.emit('pong')
      expect(ws.isAlive).toBe(true)
    })

    it.skip('should terminate unresponsive connections', () => {
      const ws = connectClient('client-1')
      ws.isAlive = false
      jest.advanceTimersByTime(30000)
      expect(ws.terminate).toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should broadcast state on new connection', () => {
      connectClient('client-1')
      expect(websocketUtils.broadcast).toHaveBeenCalled()
    })
  })

  describe('Message Handling', () => {
    const clientId = 'user-9qkradn'
    let ws: MockWebSocket
    const initialData: HrmStreamData = {
      clientId,
      value: 0,
      age: 30,
      maxHr: 185,
      calories: 0,
      isConnected: true,
    }

    beforeEach(() => {
      mockRepository.findById.mockReturnValue(initialData)
      ws = connectClient(clientId)
    })

    it('should update and broadcast on HRM_INPUT', () => {
      const message = { type: 'HRM_INPUT', data: { value: 120 } }
      ws.emit('message', JSON.stringify(message))
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...initialData,
        value: 120,
      })
      expect(websocketUtils.broadcast).toHaveBeenCalled()
    })

    it('should update metadata and broadcast on HRM_METADATA_UPDATE', () => {
      const message = {
        type: 'HRM_METADATA_UPDATE',
        data: { age: 31, maxHr: 186 },
      }
      ws.emit('message', JSON.stringify(message))
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ age: 31, maxHr: 186, isConnected: true })
      )
      expect(websocketUtils.broadcast).toHaveBeenCalled()
    })

    it('should mark client as disconnected on close', () => {
      ws.emit('close')
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isConnected: false, value: 0 })
      )
      expect(websocketUtils.broadcast).toHaveBeenCalled()
    })

    it.skip('should permanently remove client data after grace period', () => {
      ws.emit('close')
      expect(mockRepository.deleteById).not.toHaveBeenCalled()
      jest.advanceTimersByTime(RECONNECT_GRACE_PERIOD)
      expect(mockRepository.deleteById).toHaveBeenCalledWith(clientId)
      expect(websocketUtils.broadcast).toHaveBeenCalledTimes(3) // connection, close, timeout
      expect(logger.info).toHaveBeenCalledWith(
        { clientId },
        'Permanently removed client after grace period.'
      )
    })

    it.skip('should reclaim a session and cancel the deletion timer', () => {
      const deviceId = 'device-abc-123'
      const clientAData: HrmStreamData = {
        ...initialData,
        deviceId,
      }
      mockRepository.findById.mockReturnValue(clientAData)

      // 1. Client A disconnects
      ws.emit('close')
      clientAData.isConnected = false // Simulate the state change
      mockRepository.findByDeviceId.mockReturnValue(clientAData)

      // 2. Client B connects
      const clientBId = 'user-new-abc'
      const ws2 = connectClient(clientBId)
      const clientBData: HrmStreamData = {
        clientId: clientBId,
        value: 0,
        age: 40,
        maxHr: 180,
        calories: 0,
        isConnected: true,
      }
      mockRepository.findById.mockReturnValueOnce(clientBData)

      // 3. Client B sends metadata to reclaim
      const reclaimMessage = { type: 'HRM_METADATA_UPDATE', data: { deviceId } }
      ws2.emit('message', JSON.stringify(reclaimMessage))

      // 4. Verify old client is deleted and timer is cancelled
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId,
          oldClientId: clientId,
          newClientId: clientBId,
        }),
        'Reclaiming disconnected session.'
      )
      expect(mockRepository.deleteById).toHaveBeenCalledWith(clientId)

      // 5. Ensure timer doesn't fire for the old client
      jest.advanceTimersByTime(RECONNECT_GRACE_PERIOD)
      expect(mockRepository.deleteById).toHaveBeenCalledTimes(1)
    })

    it.skip('should handle zombie connections and migrate state', () => {
        const deviceId = 'device-zombie-456';
        const clientAData: HrmStreamData = { ...initialData, deviceId, age: 35, maxHr: 190 };
        mockRepository.findById.mockReturnValue(clientAData);
        mockRepository.findByDeviceId.mockReturnValue(clientAData);

        // 1. Client B connects and claims the same deviceId
        const clientBId = 'user-new-zombie';
        const ws2 = connectClient(clientBId);
        const clientBData: HrmStreamData = {
          clientId: clientBId,
          value: 0,
          age: 25,
          maxHr: 180,
          calories: 0,
          isConnected: true,
        };
        mockRepository.findById.mockReturnValueOnce(clientBData);

        const reclaimMessage = { type: 'HRM_METADATA_UPDATE', data: { deviceId } };
        ws2.emit('message', JSON.stringify(reclaimMessage));

        // 3. Verify that the zombie (Client A) is terminated and state is migrated to Client B
        expect(logger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            deviceId,
            zombieClientId: clientId,
            newClientId: clientBId,
          }),
          'Terminating zombie connection and migrating state.'
        );

        // Check that terminate was called on the correct WebSocket object
        expect(ws.terminate).toHaveBeenCalled();

        // Check that the old client's data is deleted
        expect(mockRepository.deleteById).toHaveBeenCalledWith(clientId);

        // Verify that the new client's data now contains the migrated data
        expect(clientBData.age).toBe(clientAData.age);
        expect(clientBData.maxHr).toBe(clientAData.maxHr);
    });

    it.skip('should log an error for invalid JSON messages', () => {
      ws.emit('message', 'invalid json')
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
