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

// Deeply mock the navigator.bluetooth structure
const mockCharacteristic = {
  startNotifications: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getDescriptor: jest.fn().mockResolvedValue({
    readValue: jest.fn().mockResolvedValue(new DataView(new ArrayBuffer(0))),
  }),
  readValue: jest.fn().mockResolvedValue(new DataView(new ArrayBuffer(1))),
}

const mockService = {
  getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
}

const mockGattServer = {
  connect: jest.fn().mockResolvedValue(undefined), // This is not used in the hook's logic directly
  disconnect: jest.fn(),
  getPrimaryService: jest.fn().mockResolvedValue(mockService),
}

const mockDevice = {
  id: 'test-device-id',
  name: 'Test HRM',
  gatt: {
    connected: false,
    connect: jest.fn().mockResolvedValue(mockGattServer),
    disconnect: jest.fn(),
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
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
  let consoleWarnSpy: jest.SpyInstance
  let consoleInfoSpy: jest.SpyInstance

  beforeAll(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterAll(() => {
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()
  })

  beforeEach(() => {
    jest.useFakeTimers()
    mockSendData = jest.fn()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      sendData: mockSendData,
    })
    // Reset all mock implementations to their default behavior
    jest.clearAllMocks()
    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockBluetooth.getDevices.mockResolvedValue([mockDevice])
    mockDevice.gatt.connect.mockResolvedValue(mockGattServer)
    mockGattServer.getPrimaryService.mockResolvedValue(mockService)
    mockService.getCharacteristic.mockResolvedValue(mockCharacteristic)
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
    Object.defineProperty(mockDevice.gatt, 'connected', { value: true })
    const characteristicValueChangedCallback =
      mockCharacteristic.addEventListener.mock.calls.find(
        (call) => call[0] === 'characteristicvaluechanged'
      )?.[1]
    act(() => {
      characteristicValueChangedCallback?.({
        target: { value: new DataView(new Uint8Array([0, 75]).buffer) },
      })
    })
  }

  it('should send a "death packet" when the connection becomes stale', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: {
        value: 0,
        maxHr: 190,
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

    act(() => {
      jest.advanceTimersByTime(5000)
    })
    await waitFor(() => expect(result.current.isConnected).toBe(false))

    const characteristicValueChangedCallback =
      mockCharacteristic.addEventListener.mock.calls.find(
        (call) => call[0] === 'characteristicvaluechanged'
      )?.[1]
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
    await act(async () => {
      await result.current.connectAndStream(undefined, 30)
    })
    Object.defineProperty(mockDevice.gatt, 'connected', { value: true })
    const characteristicValueChangedCallback =
      mockCharacteristic.addEventListener.mock.calls.find(
        (call) => call[0] === 'characteristicvaluechanged'
      )?.[1]
    act(() => {
      characteristicValueChangedCallback?.({
        target: { value: new DataView(new Uint8Array([0, 80]).buffer) },
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

    act(() => {
      jest.advanceTimersByTime(5000)
    })
    await waitFor(() => expect(result.current.isConnected).toBe(false))
    expect(result.current.deviceStatus).toBe('Connected (No Data)')

    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call) => call[0] === 'gattserverdisconnected'
    )?.[1]
    act(() => {
      onDisconnectedCallback?.()
    })

    expect(result.current.deviceStatus).toContain('Signal Lost. Retrying...')
  })

  it('should attempt to reconnect automatically if a deviceId is in cookies', async () => {
    // Mock useCookie to return a deviceId
    jest
      .spyOn(useCookie, 'default')
      .mockReturnValue(['test-device-id', jest.fn()])

    const { result } = renderHook(() =>
      useBluetoothHRM({ userName: 'Test User', userAge: 30 })
    )

    // It should immediately try to reconnect
    await waitFor(() => {
      expect(mockBluetooth.getDevices).toHaveBeenCalled()
    })

    // Simulate the device being found and connection succeeding
    Object.defineProperty(mockDevice.gatt, 'connected', { value: true })
    const characteristicValueChangedCallback =
      mockCharacteristic.addEventListener.mock.calls.find(
        (call) => call[0] === 'characteristicvaluechanged'
      )?.[1]

    act(() => {
      characteristicValueChangedCallback?.({
        target: { value: new DataView(new Uint8Array([0, 75]).buffer) },
      })
    })

    await waitFor(() => expect(result.current.isConnected).toBe(true))
    expect(result.current.deviceStatus).toContain('Connected to: Test HRM')
  })
})
