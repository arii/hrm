/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  setupBluetoothMocks,
  simulateHeartRateNotification,
  simulateBatteryLevelNotification,
  simulateDisconnection,
} from './lib/bluetooth-test-utils'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

describe('useBluetoothHRM', () => {
  let mockSendData: jest.Mock
  let mockBluetooth: ReturnType<typeof setupBluetoothMocks>['mockBluetooth']
  let mockDevice: ReturnType<typeof setupBluetoothMocks>['mockDevice']
  let mockGattServer: ReturnType<typeof setupBluetoothMocks>['mockGattServer']
  let mockHrCharacteristic: ReturnType<
    typeof setupBluetoothMocks
  >['mockHrCharacteristic']
  let mockBatteryCharacteristic: ReturnType<
    typeof setupBluetoothMocks
  >['mockBatteryCharacteristic']
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

    // Setup all bluetooth mocks using the new utility
    const mocks = setupBluetoothMocks()
    mockBluetooth = mocks.mockBluetooth
    mockDevice = mocks.mockDevice
    mockGattServer = mocks.mockGattServer
    mockHrCharacteristic = mocks.mockHrCharacteristic
    mockBatteryCharacteristic = mocks.mockBatteryCharacteristic
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
    Object.defineProperty(mockGattServer, 'connected', {
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

  const simulateReconnection = async () => {
    // 1. Simulate gatt disconnected state
    Object.defineProperty(mockGattServer, 'connected', {
      value: false,
      writable: true,
    })

    // 2. Simulate the 'gattserverdisconnected' event using the utility
    simulateDisconnection(mockDevice)

    // 3. Advance timers to allow the reconnect logic to run
    act(() => {
      jest.advanceTimersByTime(5000) // Default reconnect delay
    })
    await act(async () => {
      await Promise.resolve()
    })

    // 4. Simulate a successful reconnection
    Object.defineProperty(mockGattServer, 'connected', {
      value: true,
      writable: true,
    })
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
    expect(mockGattServer.disconnect).toHaveBeenCalled()
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
  })

  describe('Watchdog Timer', () => {
    it('should not trigger reconnect if data arrives within the timeout period', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({ dataLivenessTimeoutMs: 5000 })
      )
      await simulateConnection({ result })
      expect(result.current.isConnected).toBe(true)

      // Simulate receiving data every 2 seconds, which is within the 5s timeout
      for (let i = 0; i < 5; i++) {
        act(() => {
          jest.advanceTimersByTime(2000)
          simulateHeartRateNotification(mockHrCharacteristic, 75 + i)
        })
      }

      await waitFor(() => {
        expect(result.current.isDataStale).toBe(false)
        expect(result.current.deviceStatus).not.toContain('Connection unstable')
      })
    })

    it('should trigger reconnect after a data stall and then recover when data resumes', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({ dataLivenessTimeoutMs: 5000 })
      )
      await simulateConnection({ result })
      expect(result.current.isConnected).toBe(true)

      // Data stall: Advance time past the timeout without any new data
      act(() => {
        jest.advanceTimersByTime(6000)
      })

      // Check that the reconnect process has been initiated
      expect(result.current.deviceStatus).toContain('Connection unstable')
      expect(mockGattServer.disconnect).toHaveBeenCalledTimes(1)

      // Simulate data arriving again after the stall
      act(() => {
        simulateHeartRateNotification(mockHrCharacteristic, 80)
      })

      // The isDataStale flag should be reset
      await waitFor(() => {
        expect(result.current.isDataStale).toBe(false)
      })
    })
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
    expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
  })

  it('should set status to "Disconnected" on manual disconnect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    expect(result.current.isConnected).toBe(true)

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.deviceStatus).toBe('Disconnected')
  })

  it('should clear status on successful reconnect', async () => {
    const { result } = renderHook(() =>
      useBluetoothHRM({ dataLivenessTimeoutMs: 2000 })
    )
    await simulateConnection({ result })

    // Trigger a timeout to initiate the disconnection/reconnection cycle
    triggerTimeout(2000)
    expect(result.current.deviceStatus).toContain('Connection unstable')

    // Simulate the device disconnecting and the hook successfully reconnecting
    await simulateReconnection()

    // After reconnecting, the state should be clean
    expect(result.current.isConnected).toBe(true)
    expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
  })

  it('should send a null value on manual disconnect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })

    act(() => {
      result.current.disconnect()
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: { value: null },
    })
  })

  it('should send a null value on unexpected disconnection', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })

    // Simulate the 'gattserverdisconnected' event
    simulateDisconnection(mockDevice)

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: { value: null },
    })
  })

  describe('Metadata', () => {
    it('should send metadata on initial connect, but not again if user details do not change', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({ userName: 'Test User', userAge: 30 })
      )
      await simulateConnection({ result })

      expect(mockSendData).toHaveBeenCalledTimes(1)
      expect(mockSendData).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HRM_METADATA_UPDATE',
          data: expect.objectContaining({ name: 'Test User', age: 30 }),
        })
      )

      // Simulate a re-render without prop changes
      act(() => {
        result.current.connectAndStream('Test User', 30)
      })

      // No new metadata should be sent
      expect(mockSendData).toHaveBeenCalledTimes(1)
    })

    it('should send metadata again if user details change during an active connection', async () => {
      const { result, rerender } = renderHook(
        ({ userName, userAge }) => useBluetoothHRM({ userName, userAge }),
        {
          initialProps: { userName: 'Test User', userAge: 30 },
        }
      )
      await simulateConnection({ result })

      expect(mockSendData).toHaveBeenCalledTimes(1) // Initial metadata
      expect(mockSendData).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HRM_METADATA_UPDATE',
          data: expect.objectContaining({ name: 'Test User', age: 30 }),
        })
      )

      // Change user name
      rerender({ userName: 'Updated User', userAge: 30 })

      expect(mockSendData).toHaveBeenCalledTimes(2) // New metadata sent
      expect(mockSendData).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HRM_METADATA_UPDATE',
          data: expect.objectContaining({ name: 'Updated User', age: 30 }),
        })
      )
    })
  })
  describe('Heart Rate Callback', () => {
    it('should call onHeartRateUpdate when a new HR value is received', async () => {
      const mockOnHeartRateUpdate = jest.fn()
      const { result } = renderHook(() =>
        useBluetoothHRM({ onHeartRateUpdate: mockOnHeartRateUpdate })
      )
      await simulateConnection({ result })

      act(() => {
        simulateHeartRateNotification(mockHrCharacteristic, 75)
      })

      await waitFor(() => {
        expect(mockOnHeartRateUpdate).toHaveBeenCalledWith(75)
      })
    })
  })

  describe('onConnect Callback', () => {
    it('should call onConnect when a successful connection is made', async () => {
      const mockOnConnect = jest.fn()
      const { result } = renderHook(() =>
        useBluetoothHRM({ onConnect: mockOnConnect })
      )

      await act(async () => {
        result.current.connectAndStream('Test User', 30)
        await Promise.resolve() // Allow promises to resolve
      })

      expect(mockOnConnect).toHaveBeenCalledTimes(1)
    })
  })

  describe('Connection Abort', () => {
    it('should abort the connection if abortConnection is called during connection attempt', async () => {
      // Create a controllable promise for the connection
      let resolveConnection
      const connectionPromise = new Promise((resolve) => {
        resolveConnection = resolve
      })
      mockGattServer.connect.mockReturnValue(connectionPromise)

      const { result } = renderHook(() => useBluetoothHRM())

      // Start the connection
      let connectAndStreamPromise
      act(() => {
        connectAndStreamPromise = result.current.connectAndStream(
          'Test User',
          30
        )
      })

      // Abort the connection while it's in progress
      act(() => {
        result.current.disconnect()
      })

      // Allow the connection promise to resolve
      resolveConnection(mockGattServer)

      // Wait for the connectAndStream promise to settle
      await connectAndStreamPromise.catch(() => {})

      // Verify that the connection was not established
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false)
        expect(result.current.deviceStatus).toBe('Disconnected')
      })
    })
  })
})
