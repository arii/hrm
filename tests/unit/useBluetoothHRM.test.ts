/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// Mock navigator.bluetooth
const mockBluetooth = {
  requestDevice: jest.fn(),
  getDevices: jest.fn(),
}
Object.defineProperty(navigator, 'bluetooth', {
  value: mockBluetooth,
  writable: true,
})

describe('useBluetoothHRM', () => {
  let mockSendData: jest.Mock
  let mockCharacteristic: {
    startNotifications: jest.Mock
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }
  let mockGattServer: {
    connect: jest.Mock
    disconnect: jest.Mock
    getPrimaryService: jest.Mock
  }
  let mockDevice: {
    id: string
    name: string
    gatt: {
      connected: boolean
      connect: jest.Mock
      disconnect: jest.Mock
    }
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }
  let consoleWarnSpy: jest.SpyInstance
  let consoleInfoSpy: jest.SpyInstance

  beforeAll(() => {
    // Suppress console.warn and console.info for all tests in this suite
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterAll(() => {
    // Restore console methods
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()
  })

  beforeEach(() => {
    jest.useFakeTimers()
    mockSendData = jest.fn()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })

    mockCharacteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    const mockService = {
      getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
    }
    mockGattServer = {
      connect: jest.fn().mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue(mockService),
      }),
      disconnect: jest.fn(),
      getPrimaryService: jest.fn().mockResolvedValue(mockService),
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: {
        connected: false,
        connect: jest.fn().mockResolvedValue(mockGattServer),
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockBluetooth.getDevices.mockResolvedValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  type UseBluetoothHRMReturn = ReturnType<typeof useBluetoothHRM>

  const simulateConnection = async (hook: {
    result: { current: UseBluetoothHRMReturn }
  }) => {
    await act(async () => {
      hook.result.current.connectAndStream('Test User', 30)
      await Promise.resolve() // Allow promises to resolve
    })
    // Simulate gatt connected state
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: true,
      writable: true,
    })
  }

  /**
   * Advances Jest's fake timers just enough to trigger the data liveness watchdog.
   * The watchdog checks for new data every 2 seconds. This function calculates
   * the smallest time advancement needed to ensure a watchdog check occurs
   * *after* the specified timeout has elapsed.
   * @param {number} timeoutMs - The data liveness timeout period in milliseconds.
   */
  const triggerTimeout = (timeoutMs: number) => {
    const watchdogInterval = 2000 // The interval at which the watchdog checks for data
    // Calculate the time of the first watchdog check that will occur *after* the timeout has passed.
    const timeToAdvance =
      Math.floor(timeoutMs / watchdogInterval) * watchdogInterval +
      watchdogInterval
    act(() => {
      jest.advanceTimersByTime(timeToAdvance)
    })
  }

  /**
   * Simulates a full device disconnection and successful reconnection cycle.
   * This helper function orchestrates the sequence of events that the
   * `useBluetoothHRM` hook expects during a signal loss and recovery scenario.
   */
  const simulateReconnection = async () => {
    // 1. Simulate gatt disconnected state
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: false,
      writable: true,
    })

    // 2. Simulate the 'gattserverdisconnected' event
    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call) => call[0] === 'gattserverdisconnected'
    )?.[1]
    if (onDisconnectedCallback) {
      act(() => {
        onDisconnectedCallback()
      })
    }

    // 3. Advance timers to allow the reconnect logic (with its delay) to run
    act(() => {
      jest.advanceTimersByTime(2000) // Default reconnect delay
    })

    // 4. Simulate a successful reconnection by resolving the connect promise
    await act(async () => {
      // The hook's reconnect logic should have been called. Let's resolve the promise.
      await Promise.resolve()
    })
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: true,
      writable: true,
    })

    // 5. Allow any final state updates to process after reconnection
    await act(async () => {
      await Promise.resolve()
    })
  }

  it('should use default timeout of 10 seconds and trigger reconnect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await simulateConnection({ result })
    expect(result.current.isConnected).toBe(true)

    triggerTimeout(10000)

    expect(result.current.deviceStatus).toContain('Connection unstable')
    expect(result.current.disconnectionReason).toBe('timeout')
    expect(mockDevice.gatt.disconnect).toHaveBeenCalled()
  })

  it('should use custom timeout from props', async () => {
    const { result } = renderHook(() =>
      useBluetoothHRM({ dataLivenessTimeoutMs: 5000 })
    )
    await simulateConnection({ result })
    expect(result.current.isConnected).toBe(true)

    // Advance time by 4 seconds (less than timeout)
    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(result.current.deviceStatus).not.toContain('Connection unstable')

    // Advance time by another 2 seconds (total 6s, more than timeout)
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.deviceStatus).toContain('Connection unstable')
    expect(result.current.disconnectionReason).toBe('timeout')
  })

  it('should disable watchdog if timeout is 0', async () => {
    const { result } = renderHook(() =>
      useBluetoothHRM({ dataLivenessTimeoutMs: 0 })
    )
    await simulateConnection({ result })
    expect(result.current.isConnected).toBe(true)

    // Advance time by a large amount
    act(() => {
      jest.advanceTimersByTime(20000)
    })

    expect(result.current.deviceStatus).not.toContain('Connection unstable')
    expect(result.current.disconnectionReason).toBe(null)
  })

  it('should set disconnectionReason to "manual" on disconnect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    expect(result.current.isConnected).toBe(true)

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.disconnectionReason).toBe('manual')
  })

  it('should reset disconnectionReason on successful reconnect', async () => {
    const { result } = renderHook(() =>
      useBluetoothHRM({ dataLivenessTimeoutMs: 2000 })
    )
    await simulateConnection({ result })

    // Trigger a timeout to initiate the disconnection/reconnection cycle
    triggerTimeout(2000)
    expect(result.current.disconnectionReason).toBe('timeout')

    // Simulate the device disconnecting and the hook successfully reconnecting
    await simulateReconnection()

    // After reconnecting, the state should be clean
    expect(result.current.isConnected).toBe(true)
    expect(result.current.disconnectionReason).toBe(null)
  })

  describe('Throttling', () => {
    it('should throttle heart rate updates to 4Hz (250ms)', async () => {
      const { result } = renderHook(() => useBluetoothHRM())
      await simulateConnection({ result })

      const characteristicCallback =
        mockCharacteristic.addEventListener.mock.calls.find(
          (call) => call[0] === 'characteristicvaluechanged'
        )?.[1]

      expect(characteristicCallback).toBeDefined()

      // Simulate 5 rapid events in less than 250ms
      for (let i = 0; i < 5; i++) {
        act(() => {
          characteristicCallback({
            target: { value: new DataView(new Uint8Array([0, 70 + i]).buffer) },
          })
        })
      }

      // The first call should be immediate
      expect(mockSendData).toHaveBeenCalledTimes(2) // 1 for metadata, 1 for first HR value

      // Advance time by 249ms
      act(() => {
        jest.advanceTimersByTime(249)
      })
      // No new calls should have been made
      expect(mockSendData).toHaveBeenCalledTimes(2)

      // Advance time past the 250ms throttle interval
      act(() => {
        jest.advanceTimersByTime(1)
      })
      // The throttled call should now have been made
      expect(mockSendData).toHaveBeenCalledTimes(3)
    })
  })
})
