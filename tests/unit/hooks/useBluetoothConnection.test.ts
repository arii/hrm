/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useBluetoothConnection } from '@/hooks/useBluetoothConnection'
import * as cookieUtils from '@/utils/cookies'

// Mock dependencies
jest.mock('@/utils/cookies')
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

describe('useBluetoothConnection', () => {
  let mockGatt: jest.Mocked<BluetoothRemoteGATTServer>
  let mockDevice: jest.Mocked<BluetoothDevice>
  let mockBluetooth: jest.Mocked<typeof navigator.bluetooth>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    mockGatt = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      connected: false,
    } as any

    mockDevice = {
      id: 'test-device-id',
      name: 'Test Device',
      gatt: mockGatt,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as any

    mockBluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
      getDevices: jest.fn().mockResolvedValue([]),
    }

    Object.defineProperty(navigator, 'bluetooth', {
      value: mockBluetooth,
      writable: true,
      configurable: true,
    })
    ;(cookieUtils.getCookie as jest.Mock).mockReturnValue('')
    ;(cookieUtils.setCookie as jest.Mock).mockImplementation(() => {})
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should request a device and connect to it', async () => {
    const onConnect = jest.fn()
    const { result } = renderHook(() =>
      useBluetoothConnection({ serviceUuids: ['s1'], onConnect })
    )

    await act(async () => {
      await result.current.connect()
    })

    expect(mockBluetooth.requestDevice).toHaveBeenCalled()
    expect(mockGatt.connect).toHaveBeenCalled()
    expect(result.current.isConnected).toBe(true)
    expect(onConnect).toHaveBeenCalledWith(mockDevice)
  })

  it('should auto-connect to a saved device', async () => {
    ;(cookieUtils.getCookie as jest.Mock).mockReturnValue('test-device-id')
    ;(mockBluetooth.getDevices as jest.Mock).mockResolvedValue([mockDevice])

    const { result } = renderHook(() =>
      useBluetoothConnection({ serviceUuids: ['s1'] })
    )

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockGatt.connect).toHaveBeenCalled()
    expect(result.current.isConnected).toBe(true)
  })

  it('should handle manual disconnection', async () => {
    const onDisconnect = jest.fn()
    const { result } = renderHook(() =>
      useBluetoothConnection({ serviceUuids: ['s1'], onDisconnect })
    )

    await act(async () => {
      await result.current.connect()
    })

    mockGatt.connected = true

    act(() => {
      result.current.disconnect()
    })

    expect(mockGatt.disconnect).toHaveBeenCalled()
    expect(result.current.isConnected).toBe(false)
    expect(onDisconnect).toHaveBeenCalled()
  })

  it('should attempt to reconnect on unexpected disconnection', async () => {
    const { result } = renderHook(() =>
      useBluetoothConnection({ serviceUuids: ['s1'] })
    )
    let gattDisconnectedCallback: () => void = () => {}

    mockDevice.addEventListener.mockImplementation((type, callback) => {
      if (type === 'gattserverdisconnected') {
        gattDisconnectedCallback = callback as () => void
      }
    })

    await act(async () => {
      await result.current.connect()
    })

    mockGatt.connect.mockClear()

    act(() => {
      gattDisconnectedCallback()
      jest.advanceTimersByTime(2000) // Wait for the reconnect timer
    })

    expect(result.current.deviceStatus).toContain('Reconnecting')
    await act(async () => {
      await jest.runAllTimersAsync()
    })
    expect(mockGatt.connect).toHaveBeenCalled()
  })

  it('should forget the device and clear cookies', async () => {
    const { result } = renderHook(() =>
      useBluetoothConnection({ serviceUuids: ['s1'] })
    )
    await act(async () => {
      await result.current.connect()
    })

    await act(async () => {
      await result.current.forgetDevice()
    })

    expect(cookieUtils.setCookie).toHaveBeenCalledWith('hrm_device_id', '', -1)
    expect(result.current.deviceStatus).toContain('revoked')
  })
})
