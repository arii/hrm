/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { UserPreferences } from '@/hooks/useUserPreferences'

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

const mockUserPreferences: UserPreferences = {
  theme: 'dark',
  volumeLevel: 70,
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
  favoritePlaylist: '',
  userName: 'Test User',
  userAge: 30,
  userWeight: 70,
  userHeight: 175,
  gender: 'MALE',
  unitSystem: 'IMPERIAL',
  autoConnect: false,
  deviceId: null,
}

describe('useBluetoothHRM', () => {
  let mockSendData: jest.Mock
  let mockCharacteristic: {
    startNotifications: jest.Mock
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
    readValue: jest.Mock
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
    forget: jest.Mock
  }
  let consoleWarnSpy: jest.SpyInstance
  let consoleInfoSpy: jest.SpyInstance

  beforeAll(() => {
    // Suppress console.warn and console.info during tests for cleaner output
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterAll(() => {
    // Restore console methods after all tests in this suite
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
      readValue: jest
        .fn()
        .mockResolvedValue(new DataView(new Uint8Array([100]).buffer)),
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
        // Default mock is a simple resolved promise. This is overridden in specific
        // tests that need to test intermediate or pending states.
        connect: jest.fn().mockResolvedValue(mockGattServer),
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      forget: jest.fn().mockResolvedValue(undefined),
    }

    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockBluetooth.getDevices.mockResolvedValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    // Clear cookies to ensure test isolation
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
  })

  type UseBluetoothHRMReturn = ReturnType<typeof useBluetoothHRM>

  /**
   * Simulates a device connection by calling the hook's connect function
   * and waiting for the async operations to complete.
   */
  const simulateConnection = async (hook: {
    result: { current: UseBluetoothHRMReturn }
  }) => {
    await act(async () => {
      try {
        await hook.result.current.connectAndStream()
      } catch (_e) {
        // Suppress expected errors (e.g., connection failures) in specific tests
      }
    })

    // Manually set the gatt.connected state if the mock call was successful
    if (
      mockDevice.gatt.connect.mock.results.length > 0 &&
      !mockDevice.gatt.connect.mock.results[0]?.value?.isRejected
    ) {
      Object.defineProperty(mockDevice.gatt, 'connected', {
        value: true,
        writable: true,
      })
    }
  }

  /**
   * Simulates a full device disconnection and successful reconnection cycle.
   */
  const simulateReconnection = async () => {
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: false,
      writable: true,
    })

    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call) => call[0] === 'gattserverdisconnected'
    )?.[1]

    if (onDisconnectedCallback) {
      await act(async () => {
        onDisconnectedCallback()
      })
    }

    await act(async () => {
      jest.advanceTimersByTime(2000) // The hook waits 2s before reconnecting
    })

    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: true,
      writable: true,
    })
    await act(async () => {}) // Allow final state updates to process
  }

  it('should use default timeout of 10 seconds and trigger reconnect', async () => {
    const { result } = renderHook(() =>
      useBluetoothHRM({ userPreferences: mockUserPreferences })
    )

    await simulateConnection({ result })
    expect(result.current.isConnected).toBe(true)

    act(() => {
      jest.advanceTimersByTime(12000)
    })

    expect(result.current.deviceStatus).toContain('Connection unstable')
    expect(result.current.disconnectionReason).toBe('timeout')
    expect(mockDevice.gatt.disconnect).toHaveBeenCalled()
  })

  it('should use custom timeout from props', async () => {
    const { result } = renderHook(() =>
      useBluetoothHRM({
        dataLivenessTimeoutMs: 5000,
        userPreferences: mockUserPreferences,
      })
    )
    await simulateConnection({ result })
    expect(result.current.isConnected).toBe(true)

    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(result.current.deviceStatus).not.toContain('Connection unstable')

    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(result.current.deviceStatus).toContain('Connection unstable')
    expect(result.current.disconnectionReason).toBe('timeout')
  })

  it('should disable watchdog if timeout is 0', async () => {
    const { result } = renderHook(() =>
      useBluetoothHRM({
        dataLivenessTimeoutMs: 0,
        userPreferences: mockUserPreferences,
      })
    )
    await simulateConnection({ result })
    expect(result.current.isConnected).toBe(true)

    act(() => {
      jest.advanceTimersByTime(20000)
    })

    expect(result.current.deviceStatus).not.toContain('Connection unstable')
    expect(result.current.disconnectionReason).toBe(null)
  })

  it('should set disconnectionReason to "manual" on disconnect', async () => {
    const { result } = renderHook(() =>
      useBluetoothHRM({ userPreferences: mockUserPreferences })
    )
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
      useBluetoothHRM({
        dataLivenessTimeoutMs: 2000,
        userPreferences: mockUserPreferences,
      })
    )
    await simulateConnection({ result })

    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(result.current.disconnectionReason).toBe('timeout')

    await simulateReconnection()

    expect(result.current.isConnected).toBe(true)
    expect(result.current.disconnectionReason).toBe(null)
  })

  describe('Auto-Connection', () => {
    beforeEach(() => {
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
    })

    it('should NOT auto-connect if autoConnect preference is false', async () => {
      renderHook(() =>
        useBluetoothHRM({
          userPreferences: { ...mockUserPreferences, autoConnect: false },
        })
      )
      await act(async () => {
        jest.advanceTimersByTime(1)
      })
      expect(mockDevice.gatt.connect).not.toHaveBeenCalled()
    })

    it('should NOT auto-connect if WebSocket is not connected', async () => {
      ;(useWebSocket as jest.Mock).mockReturnValue({
        sendData: mockSendData,
        connectionStatus: 'Disconnected',
      })
      renderHook(() =>
        useBluetoothHRM({
          userPreferences: { ...mockUserPreferences, autoConnect: true },
        })
      )
      await act(async () => {
        jest.advanceTimersByTime(1)
      })
      expect(mockDevice.gatt.connect).not.toHaveBeenCalled()
    })

    it('should NOT auto-connect if a device is already being connected', async () => {
      // For this test, override the connect mock to never resolve, freezing the state.
      mockDevice.gatt.connect.mockImplementation(() => new Promise(() => {}))

      const { result, rerender } = renderHook(
        ({ userPreferences }) => useBluetoothHRM({ userPreferences }),
        {
          initialProps: {
            userPreferences: { ...mockUserPreferences, autoConnect: false },
          },
        }
      )

      act(() => {
        result.current.connectAndStream()
      })

      await waitFor(() => {
        expect(result.current.deviceStatus).toBe('Connecting to: Test HRM...')
      })

      rerender({
        userPreferences: { ...mockUserPreferences, autoConnect: true },
      })

      expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(1)
    })

    it('should call connectAndStream when autoConnect is true and conditions are met', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({
          userPreferences: {
            ...mockUserPreferences,
            autoConnect: true,
            deviceId: 'test-device-id',
          },
        })
      )

      await waitFor(() => {
        expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(1)
      })

      Object.defineProperty(mockDevice.gatt, 'connected', {
        value: true,
        writable: true,
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
        expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
      })
    })

    it('should handle auto-connect failure gracefully', async () => {
      mockDevice.gatt.connect.mockRejectedValue(new Error('Device not found'))
      const { result } = renderHook(() =>
        useBluetoothHRM({
          userPreferences: {
            ...mockUserPreferences,
            autoConnect: true,
            deviceId: 'test-device-id',
          },
        })
      )

      await waitFor(() => {
        expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false)
        expect(result.current.deviceStatus).toContain('Failed')
      })
    })
  })

  describe('Metadata', () => {
    it('should send metadata on initial connect, but not again if user details do not change', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({ userPreferences: mockUserPreferences })
      )
      await simulateConnection({ result })

      await waitFor(() => {
        expect(mockSendData).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'HRM_METADATA_UPDATE' })
        )
      })

      expect(mockSendData).toHaveBeenCalledTimes(1)
      expect(mockSendData).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Test User', age: 30 }),
        })
      )

      act(() => {
        result.current.connectAndStream()
      })
      expect(mockSendData).toHaveBeenCalledTimes(1)
    })

    it('should send metadata again if user details change during an active connection', async () => {
      const { result, rerender } = renderHook(
        ({ userPreferences }) => useBluetoothHRM({ userPreferences }),
        { initialProps: { userPreferences: mockUserPreferences } }
      )
      await simulateConnection({ result })

      await waitFor(() => {
        expect(mockSendData).toHaveBeenCalledTimes(1)
      })
      expect(mockSendData).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Test User' }),
        })
      )

      rerender({
        userPreferences: { ...mockUserPreferences, userName: 'Updated User' },
      })

      await waitFor(() => {
        expect(mockSendData).toHaveBeenCalledTimes(2)
      })
      expect(mockSendData).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Updated User' }),
        })
      )
    })
  })

  describe('Throttling', () => {
    it('should throttle heart rate updates with a configurable frequency', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({
          throttleMs: 500,
          userPreferences: mockUserPreferences,
        })
      )
      await simulateConnection({ result })

      await waitFor(() => {
        expect(mockSendData).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'HRM_METADATA_UPDATE' })
        )
      })
      expect(mockSendData).toHaveBeenCalledTimes(1)

      const characteristicCallback =
        mockCharacteristic.addEventListener.mock.calls.find(
          (call) => call[0] === 'characteristicvaluechanged'
        )?.[1]
      expect(characteristicCallback).toBeDefined()

      act(() => {
        for (let i = 0; i < 5; i++) {
          characteristicCallback({
            target: { value: new DataView(new Uint8Array([0, 70 + i]).buffer) },
          })
        }
      })

      // Use waitFor to poll for the expected number of calls.
      // This is more robust for testing throttled functions with fake timers.
      await waitFor(() => {
        expect(mockSendData).toHaveBeenCalledTimes(2)
      })

      // Fire another event
      act(() => {
        characteristicCallback({
          target: { value: new DataView(new Uint8Array([0, 75]).buffer) },
        })
      })

      // Advance timers again and wait for the next throttled call
      act(() => {
        jest.advanceTimersByTime(500)
      })
      await waitFor(() => {
        expect(mockSendData).toHaveBeenCalledTimes(3)
      })
    })
  })
})
