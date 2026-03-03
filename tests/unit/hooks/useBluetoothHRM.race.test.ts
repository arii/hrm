/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import Cookies from 'js-cookie'

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
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}))

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

  it('ignores subsequent connection attempts while one is in progress', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    let firstPromise: Promise<boolean> | undefined
    let secondPromise: Promise<boolean> | undefined
    act(() => {
      firstPromise = result.current.connectAndStream()
      secondPromise = result.current.connectAndStream()
    })

    await act(async () => {
      await expect(firstPromise).resolves.toBe(true)
      // The second promise resolves to false because it is skipped due to the lock
      await expect(secondPromise).resolves.toBe(false)
    })

    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    expect(mockAbort).not.toHaveBeenCalled()
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

    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    expect(mockAbort).toHaveBeenCalledTimes(0)
    expect(result.current.isConnected).toBe(true)
  })

  it('attempts connection only once when autoConnect is called multiple times concurrently', async () => {
    ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')

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

    let autoConnectPromises: Promise<void>[] = []
    act(() => {
      autoConnectPromises = [
        result.current.autoConnect(),
        result.current.autoConnect(),
        result.current.autoConnect(),
      ]
    })

    await act(async () => {
      await Promise.allSettled(autoConnectPromises)
    })

    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    expect(result.current.isConnected).toBe(true)
  })
})
