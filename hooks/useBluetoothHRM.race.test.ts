/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from './useBluetoothHRM'
import { mockBluetooth } from 'tests/unit/mocks/webBluetooth'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    sendData: jest.fn(),
    connectionStatus: 'Connected',
  }),
}))

describe('useBluetoothHRM Race Conditions', () => {
  let mockRequestDevice: jest.Mock
  let mockGattConnect: jest.Mock
  let mockAbort: jest.Mock

  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    mockAbort = jest.fn()
    mockGattConnect = jest.fn().mockImplementation(() => {
      // Simulate a connection that can be aborted
      return new Promise((resolve, reject) => {
        const signal = (global as any).mockAbortControllerSignal
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

    // Apply the mock Bluetooth environment
    Object.assign(global.navigator, {
      bluetooth: {
        ...mockBluetooth,
        requestDevice: mockRequestDevice,
        getDevices: jest.fn().mockResolvedValue([]),
      },
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
      ;(global as any).mockAbortControllerSignal = signal
      return {
        signal,
        abort: () => {
          mockAbort() // Track the abort call
          signal.aborted = true
          listeners.forEach((listener) => listener())
        },
      }
    }) as any
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete (global as any).mockAbortControllerSignal
  })

  it('should abort the previous connection attempt when a new one starts', async () => {
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

    // The first promise should reject with an AbortError because the second call cancels it
    await expect(firstPromise).rejects.toThrow('Connection cancelled')
    // The second promise should resolve successfully
    await expect(secondPromise).resolves.toBeUndefined()

    // Verify that gatt.connect was called twice
    expect(mockGattConnect).toHaveBeenCalledTimes(2)
    // Crucially, verify that abort() was called once to cancel the first attempt
    expect(mockAbort).toHaveBeenCalledTimes(1)
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
})
