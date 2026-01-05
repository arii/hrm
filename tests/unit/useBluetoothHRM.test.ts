/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

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
    // Mock and reset localStorage before each test
    const localStorageMock = (() => {
      let store: { [key: string]: string } = {}
      return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value.toString()
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key]
        }),
        clear: () => {
          store = {}
        },
      }
    })()
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })

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

    // Clear all bluetooth mocks
    mockBluetooth.requestDevice.mockReset()
    mockBluetooth.getDevices.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  type UseBluetoothHRMReturn = ReturnType<typeof useBluetoothHRM>

  const simulateConnection = async (
    hook: {
      result: { current: UseBluetoothHRMReturn }
    },
    mockDevice: BluetoothDevice
  ) => {
    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
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
  const simulateReconnection = async (mockDevice: BluetoothDevice) => {
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
      jest.advanceTimersByTime(5000) // Default reconnect delay
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
    const localMockDevice = {
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
    const { result } = renderHook(() => useBluetoothHRM())

    await simulateConnection({ result }, localMockDevice)
    expect(result.current.isConnected).toBe(true)

    triggerTimeout(10000)

    expect(result.current.deviceStatus).toContain('Connection unstable')
    expect(result.current.disconnectionReason).toBe('timeout')
    expect(localMockDevice.gatt.disconnect).toHaveBeenCalled()
  })

  it('should use custom timeout from props', async () => {
    const localMockDevice = {
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
    const { result } = renderHook(() =>
      useBluetoothHRM({ dataLivenessTimeoutMs: 5000 })
    )
    await simulateConnection({ result }, localMockDevice)
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
    const localMockDevice = {
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
    const { result } = renderHook(() =>
      useBluetoothHRM({ dataLivenessTimeoutMs: 0 })
    )
    await simulateConnection({ result }, localMockDevice)
    expect(result.current.isConnected).toBe(true)

    // Advance time by a large amount
    act(() => {
      jest.advanceTimersByTime(20000)
    })

    expect(result.current.deviceStatus).not.toContain('Connection unstable')
    expect(result.current.disconnectionReason).toBe(null)
  })

  it('should set disconnectionReason to "manual" on disconnect', async () => {
    const localMockDevice = {
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
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result }, localMockDevice)
    expect(result.current.isConnected).toBe(true)

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.disconnectionReason).toBe('manual')
  })

  it('should reset disconnectionReason on successful reconnect', async () => {
    const localMockDevice = {
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
    const { result } = renderHook(() =>
      useBluetoothHRM({ dataLivenessTimeoutMs: 2000 })
    )
    await simulateConnection({ result }, localMockDevice)

    // Trigger a timeout to initiate the disconnection/reconnection cycle
    triggerTimeout(2000)
    expect(result.current.disconnectionReason).toBe('timeout')

    // Simulate the device disconnecting and the hook successfully reconnecting
    await simulateReconnection(localMockDevice)

    // After reconnecting, the state should be clean
    expect(result.current.isConnected).toBe(true)
    expect(result.current.disconnectionReason).toBe(null)
  })

  it('should send a null value on manual disconnect', async () => {
    const localMockDevice = {
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
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result }, localMockDevice)

    act(() => {
      result.current.disconnect()
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: { value: null },
    })
  })

  it('should send a null value on unexpected disconnection', async () => {
    const localMockDevice = {
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
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result }, localMockDevice)

    // Simulate the 'gattserverdisconnected' event
    const onDisconnectedCallback =
      localMockDevice.addEventListener.mock.calls.find(
        (call) => call[0] === 'gattserverdisconnected'
      )?.[1]

    if (onDisconnectedCallback) {
      act(() => {
        onDisconnectedCallback()
      })
    }

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: { value: null },
    })
  })

  describe('Metadata', () => {
    it('should send metadata on initial connect, but not again if user details do not change', async () => {
      const localMockDevice = {
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
      const { result } = renderHook(() =>
        useBluetoothHRM({ userName: 'Test User', userAge: 30 })
      )
      await simulateConnection({ result }, localMockDevice as BluetoothDevice)

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
      const localMockDevice = {
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
      const { result, rerender } = renderHook(
        ({ userName, userAge }) => useBluetoothHRM({ userName, userAge }),
        {
          initialProps: { userName: 'Test User', userAge: 30 },
        }
      )
      await simulateConnection({ result }, localMockDevice as BluetoothDevice)

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
      const localMockDevice = {
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
      const mockOnHeartRateUpdate = jest.fn()
      const { result } = renderHook(() =>
        useBluetoothHRM({ onHeartRateUpdate: mockOnHeartRateUpdate })
      )
      await simulateConnection({ result }, localMockDevice as BluetoothDevice)

      const characteristicCallback =
        mockCharacteristic.addEventListener.mock.calls.find(
          (call) => call[0] === 'characteristicvaluechanged'
        )?.[1]
      expect(characteristicCallback).toBeDefined()

      act(() => {
        characteristicCallback({
          target: { value: new DataView(new Uint8Array([0, 75]).buffer) },
        })
      })

      expect(mockOnHeartRateUpdate).toHaveBeenCalledWith(75)
      expect(mockOnHeartRateUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('onConnect Callback', () => {
    it('should call onConnect when a successful connection is made', async () => {
      const localMockDevice = {
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
      mockBluetooth.requestDevice.mockResolvedValue(localMockDevice)
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
    it('should abort a pending connection attempt when a new one is initiated', async () => {
      const localMockDevice = {
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
      mockBluetooth.requestDevice.mockResolvedValue(localMockDevice)
      const { result } = renderHook(() => useBluetoothHRM())

      // Initiate the first call, which we expect to be aborted.
      const firstCallPromise = act(() =>
        result.current.connectAndStream('Test User', 30)
      )

      // Immediately initiate the second call.
      await act(async () => {
        await result.current.connectAndStream('Test User', 30)
      })

      // The gatt.connect should have been called for both attempts.
      expect(localMockDevice.gatt.connect).toHaveBeenCalledTimes(2)

      // Assert that the first promise was indeed rejected with an AbortError.
      await expect(firstCallPromise).rejects.toThrow('Connection cancelled')
    })
  })

  describe('autoConnect', () => {
    it('should handle saved device not found', async () => {
      // Arrange
      localStorage.setItem('hrm_device_id', 'saved-device-id')
      mockBluetooth.getDevices.mockResolvedValue([]) // No devices available
      const { result } = renderHook(() => useBluetoothHRM(), {
        wrapper: UserSettingsProvider,
      })

      // Act
      await act(async () => {
        await result.current.autoConnect()
      })

      // Assert
      await waitFor(() => {
        expect(result.current.deviceStatus).toBe('Disconnected')
      })
      expect(localStorage.removeItem).toHaveBeenCalledWith('hrm_device_id')
    })

    it('should successfully connect to a saved device', async () => {
      // Arrange
      const localMockDevice = {
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
      localStorage.setItem('hrm_device_id', 'test-device-id')
      localStorage.setItem(
        'user-prefs',
        JSON.stringify({ userName: 'Test User', userAge: 30 })
      )
      mockBluetooth.getDevices.mockResolvedValue([localMockDevice])
      const { result } = renderHook(() => useBluetoothHRM(), {
        wrapper: UserSettingsProvider,
      })

      // Act
      await act(async () => {
        await result.current.autoConnect()
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
        expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
      })
    })

    it('should correctly handle no saved device', async () => {
      // Arrange
      localStorage.removeItem('hrm_device_id') // Ensure no device is saved
      const { result } = renderHook(() => useBluetoothHRM(), {
        wrapper: UserSettingsProvider,
      })

      // Act
      await act(async () => {
        await result.current.autoConnect()
      })

      // Assert
      await waitFor(() => {
        expect(result.current.deviceStatus).toBe('Disconnected')
      })
      expect(mockBluetooth.getDevices).not.toHaveBeenCalled()
    })
  })
})
