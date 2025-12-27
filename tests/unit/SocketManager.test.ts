/**
 * @jest-environment node
 */
import { SocketManager } from '@/utils/socketManager'
import { HrmDataRepository } from '@/lib/repositories/HrmDataRepository'
import { WebSocketServer, WebSocket } from 'ws'
import { HrmStreamData, AppServices } from '@/types'
import logger from '@/utils/logger'
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
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
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
    socketManager = new SocketManager(mockWss)
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

    it('should terminate unresponsive connections', () => {
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

    it('should permanently remove client data after grace period', () => {
      // NOTE: This test was rewritten to be more robust. The previous
      // implementation relied on counting the number of `broadcast` calls,
      // which proved to be flaky in the test environment. This version
      // asserts on the *content* of the broadcast at each stage, ensuring
      // the correct state is communicated without being sensitive to the
      // exact number of calls.
      mockRepository.findAll
        .mockReturnValueOnce([{ clientId, isConnected: false }])
        .mockReturnValueOnce([])

      ws.emit('close')

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isConnected: false, value: 0 })
      )
      expect(websocketUtils.broadcast).toHaveBeenCalledWith(
        mockWss,
        expect.objectContaining({
          payload: [{ clientId, isConnected: false }],
        })
      )

      jest.advanceTimersByTime(RECONNECT_GRACE_PERIOD)
      expect(mockRepository.deleteById).toHaveBeenCalledWith(clientId)
      expect(websocketUtils.broadcast).toHaveBeenCalledWith(
        mockWss,
        expect.objectContaining({ payload: [] })
      )
    })

    it('should reclaim a session and cancel the deletion timer', () => {
      const deviceId = 'device-abc-123'
      const clientAData: HrmStreamData = {
        ...initialData,
        deviceId,
      }
      mockRepository.findById.mockReturnValue(clientAData)

      // 1. Client A disconnects
      ws.emit('close')
      clientAData.isConnected = false
      mockRepository.findByDeviceId.mockReturnValue(clientAData)

      // 2. Client B connects
      const clientBId = 'user-new-abc'
      const clientBData: HrmStreamData = {
        clientId: clientBId,
        value: 0,
        age: 40,
        maxHr: 180,
        calories: 0,
        isConnected: true,
      }
      mockRepository.findById.mockReturnValueOnce(clientBData)
      const ws2 = connectClient(clientBId)

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

    it('should handle zombie connections and migrate state', () => {
        const deviceId = 'device-zombie-456';
        const clientAId = 'user-zombie-client';
        const clientBId = 'user-new-reclaiming-client';

        const clientAData: HrmStreamData = {
          clientId: clientAId,
          deviceId,
          value: 100,
          age: 35,
          maxHr: 190,
          calories: 50,
          isConnected: true,
        };

        const clientBData: HrmStreamData = {
          clientId: clientBId,
          value: 0,
          age: 25,
          maxHr: 180,
          calories: 0,
          isConnected: true,
        };

        const clientDataStore = new Map<string, HrmStreamData>();
        clientDataStore.set(clientAId, clientAData);
        clientDataStore.set(clientBId, clientBData);

        mockRepository.findById.mockImplementation((id) => clientDataStore.get(id));
        mockRepository.findByDeviceId.mockReturnValue(clientAData);
        mockRepository.save.mockImplementation((data) => {
            clientDataStore.set(data.clientId, data);
            return data;
        });
        mockRepository.deleteById.mockImplementation((id) => {
            clientDataStore.delete(id);
            return true;
        });

        const wsA = connectClient(clientAId);
        const wsB = connectClient(clientBId);

        const reclaimMessage = { type: 'HRM_METADATA_UPDATE', data: { deviceId } };
        wsB.emit('message', JSON.stringify(reclaimMessage));

        expect(logger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            deviceId,
            zombieClientId: clientAId,
            newClientId: clientBId,
          }),
          'Terminating zombie connection and migrating state.'
        );

        expect(wsA.terminate).toHaveBeenCalled();
        expect(clientDataStore.has(clientAId)).toBe(false);

        const finalClientBData = clientDataStore.get(clientBId);
        expect(finalClientBData).toBeDefined();
        expect(finalClientBData?.age).toBe(clientAData.age);
        expect(finalClientBData?.maxHr).toBe(clientAData.maxHr);
        expect(finalClientBData?.value).toBe(0); // Ensure value isn't migrated
        expect(finalClientBData?.deviceId).toBe(deviceId);
    });

    describe('Error Handling', () => {
        it('should send an error for invalid JSON messages', () => {
          ws.emit('message', 'invalid json');
          expect(ws.send).toHaveBeenCalledWith(
            expect.stringContaining('"type":"ERROR"')
          );
          expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Invalid JSON format' }),
            'Sending error to client'
          );
          expect(logger.error).not.toHaveBeenCalled();
        });

        it('should send an error for invalid message structure', () => {
          const message = { topic: 'instead-of-type', payload: {} };
          ws.emit('message', JSON.stringify(message));
          expect(ws.send).toHaveBeenCalledWith(
            expect.stringContaining('Invalid message structure')
          );
          expect(logger.warn).toHaveBeenCalled();
        });

        it('should send an error for invalid HRM_INPUT data', () => {
          const message = { type: 'HRM_INPUT', data: { value: -10 } }; // Invalid value
          ws.emit('message', JSON.stringify(message));
          expect(ws.send).toHaveBeenCalledWith(
            expect.stringContaining('Invalid message structure')
          );
          expect(logger.warn).toHaveBeenCalled();
        });

        it('should send an error for invalid HRM_METADATA_UPDATE data', () => {
          const message = {
            type: 'HRM_METADATA_UPDATE',
            data: { age: 'not-a-number' },
          };
          ws.emit('message', JSON.stringify(message));
          expect(ws.send).toHaveBeenCalledWith(
            expect.stringContaining('Invalid message structure')
          );
          expect(logger.warn).toHaveBeenCalled();
        });
      });
  })
})
