/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from './useBluetoothHRM'
import * as WebSocketContext from '../context/WebSocketContext'
import * as cookieUtils from '../utils/cookies'

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
  let mockGatt: any
  let mockDevice: any
  let mockBluetooth: any

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
          }),
        }),
      }),
      disconnect: jest.fn(),
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: mockGatt,
      addEventListener: jest.fn(),
    }

    // Mock Web Bluetooth API
    mockBluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
      getDevices: jest.fn().mockResolvedValue([]),
    }

    Object.defineProperty(navigator, 'bluetooth', {
      value: mockBluetooth,
      writable: true,
      configurable: true,
    })
  })

  it('should not attempt to auto-connect if no device is saved', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockBluetooth.getDevices).toHaveBeenCalled()
    expect(mockGatt.connect).not.toHaveBeenCalled()
    expect(result.current.deviceStatus).toBe('Disconnected')
  })

  it('should auto-connect to a saved device', async () => {
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('test-device-id')
    mockBluetooth.getDevices.mockResolvedValue([mockDevice])
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockBluetooth.getDevices).toHaveBeenCalled()
    expect(mockGatt.connect).toHaveBeenCalled()
    expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
  })

  it('should handle silent connection failure gracefully', async () => {
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('test-device-id')
    mockBluetooth.getDevices.mockResolvedValue([mockDevice])
    mockGatt.connect.mockRejectedValue(new Error('Connection failed'))
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(result.current.deviceStatus).toBe('Disconnected')
  })

  it('should not show device picker in silent mode', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockBluetooth.requestDevice).not.toHaveBeenCalled()
  })

  it('should show device picker in non-silent mode', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      try {
        await result.current.connectAndStream()
      } catch (e) {
        // ignore
      }
    })

    expect(mockBluetooth.requestDevice).toHaveBeenCalled()
  })
})
