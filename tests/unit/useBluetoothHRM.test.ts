/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import * as useCookie from '@/hooks/useCookie'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// --- Robust Mocking Setup ---

// Create a variable to capture the event listener callback
let characteristicValueChangedCallback:
  | ((event: { target: { value: DataView } }) => void)
  | null = null

const mockCharacteristic = {
  startNotifications: jest.fn().mockResolvedValue(undefined),
  // A more robust mock that captures the listener
  addEventListener: jest.fn((eventName, callback) => {
    if (eventName === 'characteristicvaluechanged') {
      characteristicValueChangedCallback = callback
    }
  }),
  removeEventListener: jest.fn((eventName) => {
    if (eventName === 'characteristicvaluechanged') {
      characteristicValueChangedCallback = null
    }
  }),
  getDescriptor: jest.fn().mockResolvedValue({
    readValue: jest.fn().mockResolvedValue(new DataView(new ArrayBuffer(0))),
  }),
  readValue: jest.fn().mockResolvedValue(new DataView(new ArrayBuffer(1))),
}

const mockService = {
  getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
}

const mockGattServer = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  getPrimaryService: jest.fn().mockResolvedValue(mockService),
}

// Create a variable to capture the disconnect listener
let gattServerDisconnectedCallback: (() => void) | null = null

const mockDevice = {
  id: 'test-device-id',
  name: 'Test HRM',
  gatt: {
    connected: false,
    connect: jest.fn().mockResolvedValue(mockGattServer),
    disconnect: jest.fn(),
  },
  // Capture the disconnect listener
  addEventListener: jest.fn((eventName, callback) => {
    if (eventName === 'gattserverdisconnected') {
      gattServerDisconnectedCallback = callback
    }
  }),
  removeEventListener: jest.fn((eventName) => {
    if (eventName === 'gattserverdisconnected') {
      gattServerDisconnectedCallback = null
    }
  }),
  watchAdvertisements: jest.fn().mockResolvedValue(undefined),
}

const mockBluetooth = {
  requestDevice: jest.fn().mockResolvedValue(mockDevice),
  getDevices: jest.fn().mockResolvedValue([mockDevice]),
}

Object.defineProperty(navigator, 'bluetooth', {
  value: mockBluetooth,
  writable: true,
})

describe('useBluetoothHRM', () => {
  let mockSendData: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    mockSendData = jest.fn()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      sendData: mockSendData,
    })
    jest.clearAllMocks()

    // Reset mocks to their initial state before each test
    characteristicValueChangedCallback = null
    gattServerDisconnectedCallback = null
    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockBluetooth.getDevices.mockResolvedValue([mockDevice])
    mockDevice.gatt.connect.mockResolvedValue(mockGattServer)
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: false,
      writable: true,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  })

  type UseBluetoothHRMReturn = ReturnType<typeof useBluetoothHRM>

  const simulateConnection = async (hook: {
    result: { current: UseBluetoothHRMReturn }
  }) => {
    await act(async () => {
      await hook.result.current.connectAndStream('Test User', 30)
    })
    act(() => {
      Object.defineProperty(mockDevice.gatt, 'connected', { value: true })
    })
    if (characteristicValueChangedCallback) {
      act(() => {
        characteristicValueChangedCallback!({
          target: { value: new DataView(new Uint8Array([0, 75]).buffer) },
        })
      })
    }
  }

  // --- Tests ---

  it('should send a "death packet" when the connection becomes stale', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: { value: 0, maxHr: 190, name: 'Test User', age: 30 },
    })
    await waitFor(() => expect(result.current.isConnected).toBe(false))
    expect(result.current.deviceStatus).toBe('Connected (No Data)')
  })

  it('should recover from a stale connection when new data arrives', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => {
      jest.advanceTimersByTime(5000)
    })
    await waitFor(() => expect(result.current.isConnected).toBe(false))

    act(() => {
      characteristicValueChangedCallback?.({
        target: { value: new DataView(new Uint8Array([0, 78]).buffer) },
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

    act(() => {
      jest.advanceTimersByTime(2000) // Less than the stale timeout
    })

    const lastCall = mockSendData.mock.calls.pop()
    expect(lastCall[0].data.value).not.toBe(0)
    expect(result.current.isConnected).toBe(true)
  })

  it('should use the device name as a fallback when no user name is provided', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await act(async () => {
      await result.current.connectAndStream(undefined, 30)
    })
    act(() => {
      Object.defineProperty(mockDevice.gatt, 'connected', { value: true })
    })
    act(() => {
      characteristicValueChangedCallback?.({
        target: { value: new DataView(new Uint8Array([0, 80]).buffer) },
      })
    })

    await waitFor(() => expect(result.current.isConnected).toBe(true))
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Bluetooth HRM (Test HRM)' }),
      })
    )
  })

  it('should handle device disconnection while in a stale state', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => {
      jest.advanceTimersByTime(5000)
    })
    await waitFor(() => expect(result.current.isConnected).toBe(false))

    act(() => {
      gattServerDisconnectedCallback?.()
    })

    expect(result.current.deviceStatus).toContain('Signal Lost. Retrying...')
  })

  it('should attempt to reconnect automatically if a deviceId is in cookies', async () => {
    jest
      .spyOn(useCookie, 'default')
      .mockReturnValue(['test-device-id', jest.fn()])

    const { result } = renderHook(() =>
      useBluetoothHRM({ userName: 'Test User', userAge: 30 })
    )

    await waitFor(() => {
      expect(mockBluetooth.getDevices).toHaveBeenCalled()
      expect(mockDevice.gatt.connect).toHaveBeenCalled()
    })

    act(() => {
      Object.defineProperty(mockDevice.gatt, 'connected', { value: true })
    })
    act(() => {
      characteristicValueChangedCallback?.({
        target: { value: new DataView(new Uint8Array([0, 75]).buffer) },
      })
    })

    await waitFor(() => expect(result.current.isConnected).toBe(true))
    expect(result.current.deviceStatus).toContain('Connected to: Test HRM')
  })
})
