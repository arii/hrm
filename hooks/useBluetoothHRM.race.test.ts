/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from './useBluetoothHRM'
import { mockBluetooth } from '@/tests/unit/mocks/webBluetooth'
import * as cookieUtils from '@/utils/cookies'

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
        setTimeout(() => resolve({}), 200)
      })
    })

    mockRequestDevice = jest.fn().mockResolvedValue({
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: {
        connect: mockGattConnect,
      },
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

  it('should ignore subsequent connection attempts while one is in progress', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    // Start the first connection attempt
    let firstPromise: Promise<void> | undefined
    act(() => {
      firstPromise = result.current.connectAndStream()
    })

    // Immediately start the second connection attempt
    let secondPromise: Promise<void> | undefined
    act(() => {
      secondPromise = result.current.connectAndStream()
    })

    // Both promises should resolve successfully. The first one establishes the connection,
    // and the second one is ignored due to the connection lock.
    await expect(firstPromise).resolves.toBeUndefined()
    await expect(secondPromise).resolves.toBeUndefined()

    // Verify that gatt.connect was only called ONCE for the first attempt.
    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    // Crucially, verify that abort() was NOT called, as the second attempt was ignored, not aborted.
    expect(mockAbort).not.toHaveBeenCalled()
    // The final status should be connected
    expect(result.current.isConnected).toBe(true)
  })

  it('should not throw an error if a new connection is initiated after the first one is complete', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    // Start the first connection and wait for it to complete
    await act(async () => {
      await result.current.connectAndStream()
    })

    // Once the first connection is established, start a second one.
    // This simulates a user action like a re-scan.
    await act(async () => {
      await result.current.connectAndStream()
    })

    // In this scenario, the first connection completes, and the second one starts.
    // The second call to connectToGatt will abort the (now non-existent) previous
    // pending connection, but it should not cause an unhandled rejection.
    expect(mockGattConnect).toHaveBeenCalledTimes(2)
    // Abort should still be called as the hook cleans up previous attempts
    expect(mockAbort).toHaveBeenCalledTimes(1)
    // The final status should be connected
    expect(result.current.isConnected).toBe(true)
  })

  it('should only attempt to connect once when autoConnect is called multiple times concurrently', async () => {
    // Simulate that a device has been previously connected and its ID is saved
    mockedCookieUtils.getCookie.mockReturnValue('test-device-id')

    // Simulate that the device is available to be re-connected to
    const mockSavedDevice = {
      id: 'test-device-id',
      name: 'Saved HRM',
      gatt: {
        connect: mockGattConnect,
      },
    }
    Object.defineProperty(global.navigator, 'bluetooth', {
      value: {
        ...mockBluetooth,
        getDevices: jest.fn().mockResolvedValue([mockSavedDevice]),
      },
      writable: true,
    })

    const { result } = renderHook(() => useBluetoothHRM())

    // Act: Call autoConnect multiple times in parallel to simulate a race condition
    await act(async () => {
      const autoConnectPromises = [
        result.current.autoConnect(),
        result.current.autoConnect(),
        result.current.autoConnect(),
      ]
      // We don't care about the result of the promises, just that they complete
      await Promise.allSettled(autoConnectPromises)
    })

    // Assert: Check that gatt.connect was only called once, proving the lock works
    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    // The final status should be connected
    expect(result.current.isConnected).toBe(true)
  })
})
