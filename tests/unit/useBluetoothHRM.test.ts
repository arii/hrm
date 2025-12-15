/**
 * @jest-environment jsdom
 */
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

  const simulateConnection = async (hook: any) => {
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

  it('should use default timeout of 10 seconds and trigger reconnect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await simulateConnection({ result })
    expect(result.current.isConnected).toBe(true)

    // Advance time past the 10s timeout to the next 2s interval check
    act(() => {
      jest.advanceTimersByTime(12000)
    })

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

    // Trigger a timeout. Timeout is 2s, watchdog checks every 2s.
    // The check at T=2s will be (2000-0) > 2000 (false).
    // The check at T=4s will be (4000-0) > 2000 (true).
    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(result.current.disconnectionReason).toBe('timeout')

    // Simulate gatt disconnected state
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: false,
      writable: true,
    })

    // Simulate gatt server disconnection event
    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call) => call[0] === 'gattserverdisconnected'
    )[1]
    act(() => {
      onDisconnectedCallback()
    })

    // It should now be trying to reconnect
    expect(result.current.deviceStatus).toContain('Signal Lost. Retrying...')
    expect(result.current.disconnectionReason).toBe('signal_loss')

    // Advance timers for the reconnect delay
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    // Simulate successful reconnection
    await act(async () => {
      await Promise.resolve() // Allow promises to resolve after reconnect attempt
    })
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: true,
      writable: true,
    })

    // Re-check status after reconnect logic (might need another tick)
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.isConnected).toBe(true)
    expect(result.current.disconnectionReason).toBe(null)
  })
})
