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

describe('useBluetoothHRM Race Conditions', () => {
  let mockSendData: jest.Mock
  let mockDevice: {
    id: string
    name: string
    gatt: {
      connected: boolean
      connect: jest.Mock
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

    const mockService = {
      getCharacteristic: jest.fn().mockResolvedValue({
        startNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    }
    // This is the object that connect() resolves to. It must have getPrimaryService()
    const resolvedGattServer = {
      getPrimaryService: jest.fn().mockResolvedValue(mockService),
      disconnect: jest.fn(),
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: {
        connected: false,
        // The connect mock should resolve with the server object
        connect: jest.fn().mockResolvedValue(resolvedGattServer),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockBluetooth.getDevices.mockResolvedValue([])
    // Suppress console output for this test
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(console.warn as jest.Mock).mockRestore()
    ;(console.info as jest.Mock).mockRestore()
  })

  it('should only trigger one reconnect attempt when disconnect event fires multiple times', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    // 1. Initial connection
    await act(async () => {
      await result.current.connectAndStream()
    })
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: true,
      writable: true,
    })

    // 2. Find the disconnect callback
    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call) => call[0] === 'gattserverdisconnected'
    )?.[1]
    expect(onDisconnectedCallback).toBeDefined()

    // 3. Simulate device disconnection
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: false,
      writable: true,
    })

    // 4. Fire the disconnect event multiple times in quick succession
    act(() => {
      onDisconnectedCallback()
      onDisconnectedCallback()
      onDisconnectedCallback()
    })

    // 5. Advance timers to trigger the reconnect
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })

    // 6. Assert that connect was only called ONCE for the reconnect
    // The first call is from the initial connectAndStream
    expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(2)
  })

  it('should allow subsequent reconnect attempts after a failed attempt', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await act(async () => await result.current.connectAndStream())
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: true,
      writable: true,
    })

    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call) => call[0] === 'gattserverdisconnected'
    )?.[1]

    // --- First Disconnect and Failed Reconnect ---
    mockDevice.gatt.connect.mockRejectedValueOnce(
      new Error('Connection failed')
    )
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: false,
      writable: true,
    })
    act(() => onDisconnectedCallback())
    await act(async () => {
      jest.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    // Assert that the first reconnect attempt was made
    expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(2)

    // --- Second Disconnect and Successful Reconnect ---
    mockDevice.gatt.connect.mockResolvedValueOnce({
      getPrimaryService: jest.fn().mockResolvedValue({
        getCharacteristic: jest.fn().mockResolvedValue({
          startNotifications: jest.fn(),
          addEventListener: jest.fn(),
        }),
      }),
      disconnect: jest.fn(),
    })
    act(() => onDisconnectedCallback())
    await act(async () => {
      jest.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    // Assert that the second reconnect attempt was made
    expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(3)
  })

  it('should correctly reset state if a manual connection interrupts a pending auto-reconnect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await act(async () => await result.current.connectAndStream())
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: true,
      writable: true,
    })

    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call) => call[0] === 'gattserverdisconnected'
    )?.[1]

    // --- 1. Trigger a disconnect to start the auto-reconnect timeout ---
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: false,
      writable: true,
    })
    act(() => onDisconnectedCallback())

    // --- 2. Before the timeout fires, initiate a manual connect ---
    await act(async () => {
      await result.current.connectAndStream()
    })

    // Assert that the manual connection attempt was made immediately,
    // and the previous reconnect attempt was cancelled.
    // (Initial connect + manual connect = 2 calls)
    expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(2)

    // --- 3. Trigger another disconnect ---
    // This ensures that the cleanup from the manual connection allows
    // a new auto-reconnect to be scheduled.
    act(() => onDisconnectedCallback())
    await act(async () => {
      jest.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    // Assert that a new reconnect attempt was made
    expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(3)
  })
})
