/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from './useBluetoothHRM'
import * as WebSocketContext from '../context/WebSocketContext'
import * as cookieUtils from '../utils/cookies'
import { BluetoothConnectionStatus } from '../types/bluetooth'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')
jest.mock('@/utils/cookies')

// Mock logger
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

describe('useBluetoothHRM', () => {
  let mockGatt: jest.Mock
  let mockDevice: {
    id: string
    name: string
    gatt: jest.Mocked<BluetoothRemoteGATT>
    addEventListener: jest.Mock
  }
  let mockBluetooth: jest.Mocked<Bluetooth>

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Mock WebSocket context
    jest.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      hrmData: [],
      timerData: {
        phase: 'idle',
        timeRemaining: 0,
        currentRound: 0,
        totalRounds: 0,
      },
      spotifyData: null,
      workoutData: {
        totalCalories: 0,
        workoutDuration: 0,
      },
      lastJsonMessage: null,
    })

    // Mock cookie functions
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('')
    jest.spyOn(cookieUtils, 'setCookie').mockImplementation(() => {})

    // Mock Bluetooth device
    mockGatt = {
      connect: jest.fn().mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue({
          getCharacteristic: jest.fn().mockResolvedValue({
            startNotifications: jest.fn().mockResolvedValue(undefined),
            addEventListener: jest.fn(),
            readValue: jest
              .fn()
              .mockResolvedValue(new DataView(new Uint8Array([50]).buffer)),
          }),
        }),
      }),
      disconnect: jest.fn(),
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: mockGatt as jest.Mocked<BluetoothRemoteGATT>,
      addEventListener: jest.fn(),
    }

    // Mock Web Bluetooth API
    mockBluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
      getDevices: jest.fn().mockResolvedValue([]),
    } as jest.Mocked<Bluetooth>

    Object.defineProperty(navigator, 'bluetooth', {
      value: mockBluetooth,
      writable: true,
      configurable: true,
    })
  })

  it('should correctly update the connection status enum', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    expect(result.current.status).toBe(BluetoothConnectionStatus.DISCONNECTED)

    await act(async () => {
      await result.current.connectAndStream()
    })

    expect(result.current.status).toBe(BluetoothConnectionStatus.CONNECTED)

    await act(async () => {
      result.current.disconnect()
    })

    expect(result.current.status).toBe(BluetoothConnectionStatus.DISCONNECTED)
  })

  it('should not attempt to auto-connect if no device is saved', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockBluetooth.getDevices).toHaveBeenCalled()
    expect(mockGatt.connect).not.toHaveBeenCalled()
    expect(result.current.status).toBe(BluetoothConnectionStatus.DISCONNECTED)
  })

  it('should auto-connect to a saved device', async () => {
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('test-device-id')
    mockBluetooth.getDevices.mockResolvedValue([mockDevice as unknown as BluetoothDevice])
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockBluetooth.getDevices).toHaveBeenCalled()
    expect(mockGatt.connect).toHaveBeenCalled()
    expect(result.current.status).toBe(BluetoothConnectionStatus.CONNECTED)
  })

  it('should handle silent connection failure gracefully', async () => {
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('test-device-id')
    mockBluetooth.getDevices.mockResolvedValue([mockDevice as unknown as BluetoothDevice])
    mockGatt.connect.mockRejectedValue(new Error('Connection failed'))
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(result.current.status).toBe(BluetoothConnectionStatus.DISCONNECTED)
  })

  it('should set status to "Disconnected" on manual disconnect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.connectAndStream()
    })

    expect(result.current.isConnected).toBe(true)

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.status).toBe(BluetoothConnectionStatus.DISCONNECTED)
  })
})
