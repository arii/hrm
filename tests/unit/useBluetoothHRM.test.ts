/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import useCookie from '@/hooks/useCookie'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// Mock the useCookie hook
jest.mock('@/hooks/useCookie', () => ({
  __esModule: true,
  default: jest.fn(),
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
  let mockSetDeviceId: jest.Mock

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

    mockSetDeviceId = jest.fn()
    ;(useCookie as jest.Mock).mockReturnValue(['test-device-id', mockSetDeviceId])

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
    mockBluetooth.getDevices.mockResolvedValue([mockDevice])
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

    // Manually trigger the first characteristic value change to signal that the
    // connection is live and not stale. This is what sets isConnected to true.
    const characteristicValueChangedCallback =
      mockCharacteristic.addEventListener.mock.calls.find(
        (call) => call[0] === 'characteristicvaluechanged'
      )?.[1]

    if (characteristicValueChangedCallback) {
      act(() => {
        characteristicValueChangedCallback({
          target: {
            value: new DataView(new Uint8Array([0, 75]).buffer),
          },
        })
      })
    }
  }

  it('should attempt to reconnect on mount if a device ID is saved', async () => {
    renderHook(() => useBluetoothHRM({ userName: 'Test User', userAge: 30 }))
    await waitFor(() => expect(mockBluetooth.getDevices).toHaveBeenCalled())
    await waitFor(() => expect(mockDevice.gatt.connect).toHaveBeenCalled())
  })

  it('should send a "death packet" when the connection becomes stale', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    // Advance time by 5 seconds (more than the 4-second threshold)
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: {
        value: 0,
        maxHr: 190, // 220 - 30
        name: 'Test User',
        age: 30,
      },
    })
    await waitFor(() => expect(result.current.isConnected).toBe(false))
    expect(result.current.deviceStatus).toBe('Connected (No Data)')
  })

  it('should recover from a stale connection when new data arrives', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    // Advance time to trigger staleness
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => expect(result.current.isConnected).toBe(false))

    // Simulate a new heart rate value arriving
    const characteristicValueChangedCallback =
      mockCharacteristic.addEventListener.mock.calls.find(
        (call) => call[0] === 'characteristicvaluechanged'
      )?.[1]

    act(() => {
      characteristicValueChangedCallback({
        target: {
          value: new DataView(new Uint8Array([0, 75]).buffer),
        },
      })
    })

    await waitFor(() => expect(result.current.isConnected).toBe(true))
    expect(result.current.deviceStatus).toContain('Connected to: Test HRM')
  })

  it('should report isConnected as false initially and true after connection', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    expect(result.current.isConnected).toBe(false)

    await simulateConnection({ result })

    await waitFor(() => expect(result.current.isConnected).toBe(true))
  })

  it('should not send a "death packet" if the connection is not stale', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    // Advance time by 2 seconds (less than the 4-second threshold)
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(mockSendData).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 0 }),
      })
    )
    expect(result.current.isConnected).toBe(true)
  })

  it('should use the device name as a fallback when no user name is provided', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    // Simulate connection without providing a user name
    await act(async () => {
      result.current.connectAndStream(undefined, 30)
      await Promise.resolve()
    })
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: true,
      writable: true,
    })

    const characteristicValueChangedCallback =
      mockCharacteristic.addEventListener.mock.calls.find(
        (call) => call[0] === 'characteristicvaluechanged'
      )?.[1]

    act(() => {
      characteristicValueChangedCallback({
        target: {
          value: new DataView(new Uint8Array([0, 80]).buffer),
        },
      })
    })

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Bluetooth HRM (Test HRM)',
        }),
      })
    )
  })

  it('should handle device disconnection while in a stale state', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    // Advance time to trigger staleness
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => expect(result.current.isConnected).toBe(false))
    expect(result.current.deviceStatus).toBe('Connected (No Data)')

    // Simulate the device disconnecting
    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call) => call[0] === 'gattserverdisconnected'
    )?.[1]

    act(() => {
      onDisconnectedCallback()
    })

    expect(result.current.deviceStatus).toContain('Signal Lost. Retrying...')
  })
})
