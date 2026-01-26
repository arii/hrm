/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import useBluetoothConnection from '@/hooks/useBluetoothConnection'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import * as cookieUtils from '@/utils/cookies'
import { mock, mockClear } from 'jest-mock-extended'

// Mock logger to prevent console output during tests
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// Mock cookie utilities
jest.mock('@/utils/cookies')
const mockedCookieUtils = cookieUtils as jest.Mocked<typeof cookieUtils>

// Mock Web Bluetooth API
const mockGattServer = mock<BluetoothRemoteGATTServer>()
const mockDevice = mock<BluetoothDevice>()
const mockNavigatorBluetooth = mock<Bluetooth>()

Object.defineProperty(window.navigator, 'bluetooth', {
  writable: true,
  value: mockNavigatorBluetooth,
})

describe('useBluetoothConnection', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockClear(mockGattServer)
    mockClear(mockDevice)
    mockClear(mockNavigatorBluetooth)
    mockedCookieUtils.getCookie.mockReturnValue('')
    mockedCookieUtils.setCookie.mockImplementation(() => {})

    // Default mock implementations
    mockDevice.gatt.connect.mockResolvedValue(mockGattServer)
    mockNavigatorBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockNavigatorBluetooth.getDevices.mockResolvedValue([])
  })

  it('should initialize with disconnected status', () => {
    const { result } = renderHook(() => useBluetoothConnection())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.deviceStatus).toBe('Disconnected')
  })

  it('should connect to a device successfully', async () => {
    const onConnect = jest.fn()
    const { result } = renderHook(() => useBluetoothConnection({ onConnect }))

    await act(async () => {
      await result.current.connect()
    })

    expect(mockNavigatorBluetooth.requestDevice).toHaveBeenCalled()
    expect(mockDevice.gatt.connect).toHaveBeenCalled()
    expect(result.current.isConnected).toBe(true)
    expect(result.current.deviceStatus).toContain('Connected')
    expect(onConnect).toHaveBeenCalledWith(mockGattServer)
  })

  it('should handle connection failure', async () => {
    const error = new Error('Connection failed')
    mockDevice.gatt.connect.mockRejectedValue(error)
    const { result } = renderHook(() => useBluetoothConnection())

    await act(async () => {
      await expect(result.current.connect()).rejects.toThrow(
        'Connection failed'
      )
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.deviceStatus).toContain('Failed')
  })

  it('should disconnect from a device', async () => {
    const onDisconnect = jest.fn()
    const { result } = renderHook(() =>
      useBluetoothConnection({ onDisconnect })
    )

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.isConnected).toBe(true)

    act(() => {
      result.current.disconnect()
    })

    expect(mockDevice.gatt.disconnect).toHaveBeenCalled()
    expect(result.current.isConnected).toBe(false)
    expect(result.current.deviceStatus).toBe('Disconnected')
  })

  it('should forget a device', async () => {
    const { result } = renderHook(() => useBluetoothConnection())

    await act(async () => {
      await result.current.connect()
    })

    await act(async () => {
      await result.current.forgetDevice()
    })

    expect(mockedCookieUtils.setCookie).toHaveBeenCalledWith(
      'hrm_device_id',
      '',
      -1
    )
    expect(result.current.deviceStatus).toContain('Device permissions revoked')
  })

  it('should auto-connect to a saved device', async () => {
    mockedCookieUtils.getCookie.mockReturnValue('test-device-id')
    mockDevice.id = 'test-device-id'
    mockNavigatorBluetooth.getDevices.mockResolvedValue([mockDevice])

    const { result } = renderHook(() => useBluetoothConnection())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockNavigatorBluetooth.getDevices).toHaveBeenCalled()
    expect(mockDevice.gatt.connect).toHaveBeenCalled()
    expect(result.current.isConnected).toBe(true)
  })

  it('should attempt to reconnect on unexpected disconnection', async () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useBluetoothConnection())

    // Connect first
    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.isConnected).toBe(true)

    // Simulate disconnection
    let disconnectCallback: () => void
    const addEventListenerSpy = jest.spyOn(mockDevice, 'addEventListener')

    act(() => {
      disconnectCallback = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'gattserverdisconnected'
      )?.[1] as () => void
      if (disconnectCallback) disconnectCallback()
    })

    expect(result.current.deviceStatus).toContain('Reconnecting')

    // Fast-forward timers
    await act(async () => {
      jest.runOnlyPendingTimers()
      await Promise.resolve()
    })

    expect(mockDevice.gatt.connect).toHaveBeenCalledTimes(2) // Initial connect + reconnect
    jest.useRealTimers()
  })
})
