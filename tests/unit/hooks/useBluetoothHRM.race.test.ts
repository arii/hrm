/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import * as cookieUtils from '@/utils/cookies'

const mockBluetooth = {
  getAvailability: jest.fn().mockResolvedValue(true),
  requestDevice: jest.fn(),
  getDevices: jest.fn().mockResolvedValue([]),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    sendData: jest.fn(),
    connectionStatus: 'Connected',
  }),
}))

// Mock cookie utilities
jest.mock('@/utils/cookies', () => ({
  getCookie: jest.fn(),
  setCookie: jest.fn(),
}))

const mockedCookieUtils = cookieUtils as jest.Mocked<typeof cookieUtils>

describe('useBluetoothHRM Race Conditions', () => {
  const originalNavigator = global.navigator
  let mockRequestDevice: jest.Mock
  let mockGattConnect: jest.Mock
  let mockAbort: jest.Mock

  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    mockAbort = jest.fn()
    mockGattConnect = jest.fn().mockImplementation(() => {
      // Simulate a connection that can be aborted
      return new Promise((resolve, reject) => {
        const signal = (
          global as unknown as { mockAbortControllerSignal: AbortSignal }
        ).mockAbortControllerSignal
        if (signal?.aborted) {
          const error = new DOMException('Connection cancelled', 'AbortError')
          reject(error)
          return
        }
        signal?.addEventListener('abort', () => {
          const error = new DOMException('Connection cancelled', 'AbortError')
          reject(error)
        })
        // Simulate a delay in connection
        const mockCharacteristic = {
          startNotifications: jest.fn().mockResolvedValue(undefined),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }
        const mockService = {
          getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
        }
        const mockServer = {
          getPrimaryService: jest.fn().mockResolvedValue(mockService),
          disconnect: jest.fn(),
        }
        setTimeout(() => resolve(mockServer), 200)
      })
    })

    mockRequestDevice = jest.fn().mockResolvedValue({
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: {
        connect: mockGattConnect,
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })

    // Safe mocking
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        bluetooth: {
          ...mockBluetooth,
          requestDevice: mockRequestDevice,
          getDevices: jest.fn().mockResolvedValue([]),
        },
      },
      writable: true,
    })

    // Mock AbortController
    global.AbortController = jest.fn().mockImplementation(() => {
      const listeners: (() => void)[] = []
      const signal = {
        aborted: false,
        addEventListener: (event: string, listener: () => void) => {
          if (event === 'abort') {
            listeners.push(listener)
          }
        },
        removeEventListener: jest.fn(),
        reason: undefined,
        throwIfAborted: jest.fn(),
        onabort: null,
      }
      ;(
        global as unknown as { mockAbortControllerSignal: AbortSignal }
      ).mockAbortControllerSignal = signal
      return {
        signal,
        abort: () => {
          mockAbort() // Track the abort call
          signal.aborted = true
          listeners.forEach((listener) => listener())
        },
      }
    }) as jest.Mock
  })

  afterEach(() => {
    // Restore original
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
    jest.clearAllMocks()
    delete (global as unknown as { mockAbortControllerSignal: AbortSignal })
      .mockAbortControllerSignal
  })

  it('aborts and restarts connection if subsequent connection attempt is made while one is in progress', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    let firstPromise: Promise<boolean> | undefined
    let secondPromise: Promise<boolean> | undefined
    await act(async () => {
      firstPromise = result.current.connectAndStream()
      // Wait a tiny bit to ensure the first one starts
      await new Promise((resolve) => setTimeout(resolve, 0))
      secondPromise = result.current.connectAndStream()
    })

    await act(async () => {
      // The first one should be aborted
      await expect(firstPromise).rejects.toThrow('Connection cancelled')
      // The second one should succeed
      await expect(secondPromise).resolves.toBe(true)
    })

    // gatt.connect should be called twice (one for each attempt)
    expect(mockGattConnect).toHaveBeenCalledTimes(2)
    expect(mockAbort).toHaveBeenCalledTimes(1)
    expect(result.current.isConnected).toBe(true)
  })

  it('does not throw error if a new connection is initiated after the first one is complete', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.connectAndStream()
    })

    await act(async () => {
      await result.current.connectAndStream()
    })

    // Should be called once because it was already connected
    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    expect(mockAbort).toHaveBeenCalledTimes(0)
    expect(result.current.isConnected).toBe(true)
  })

  it('attempts connection only once when autoConnect is called multiple times concurrently because of the guard in autoConnect', async () => {
    mockedCookieUtils.getCookie.mockReturnValue('test-device-id')

    const mockSavedDevice = {
      id: 'test-device-id',
      name: 'Saved HRM',
      gatt: {
        connect: mockGattConnect,
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    Object.defineProperty(global.navigator, 'bluetooth', {
      value: {
        ...mockBluetooth,
        getDevices: jest.fn().mockResolvedValue([mockSavedDevice]),
      },
      writable: true,
    })

    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      const autoConnectPromises = [
        result.current.autoConnect(),
        result.current.autoConnect(),
        result.current.autoConnect(),
      ]
      await Promise.allSettled(autoConnectPromises)
    })

    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    expect(result.current.isConnected).toBe(true)
  })
})
