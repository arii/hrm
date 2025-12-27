/**
 * @jest-environment jsdom
 * @file useBluetoothHRM.test.ts
 * @description Unit tests for the refactored useBluetoothHRM hook.
 * This suite tests the hook's ability to interact with the mocked
 * DeviceManagerService and manage its own state correctly.
 */

import { renderHook, act } from '@testing-library/react'
import { useBluetoothHRM } from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import useLocalStorage from '@/hooks/useLocalStorage'

// Mock DeviceManagerService
const mockDeviceManager = {
  findAndConnect: jest.fn(),
  disconnect: jest.fn(),
  forget: jest.fn(),
  connectToDevice: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  device: { id: 'test-device', name: 'Test Device', forget: jest.fn() },
}
jest.mock('@/services/DeviceManagerService', () => {
  return jest.fn().mockImplementation(() => mockDeviceManager)
})

// Mock useWebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// Mock useLocalStorage hook
jest.mock('@/hooks/useLocalStorage', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  }
})

describe('useBluetoothHRM Hook', () => {
  let mockSendData: jest.Mock
  let mockSetLastDeviceId: jest.Mock

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()

    mockSendData = jest.fn()
    mockSetLastDeviceId = jest.fn()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
    ;(useLocalStorage as jest.Mock).mockReturnValue([null, mockSetLastDeviceId])
  })
  // Test 1: Initial state
  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useBluetoothHRM({}))
    expect(result.current.deviceStatus).toBe('Disconnected')
    expect(result.current.isConnected).toBe(false)
    expect(result.current.batteryLevel).toBeNull()
  })

  // Test 2: Successful connection
  it('should call findAndConnect on connect and update status', async () => {
    mockDeviceManager.findAndConnect.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useBluetoothHRM({}))

    await act(async () => {
      await result.current.connect()
    })

    expect(mockDeviceManager.findAndConnect).toHaveBeenCalledTimes(1)
  })

  // Test 3: Disconnection
  it('should call disconnect on the service', () => {
    const { result } = renderHook(() => useBluetoothHRM({}))
    act(() => {
      result.current.disconnect()
    })
    expect(mockDeviceManager.disconnect).toHaveBeenCalledTimes(1)
  })

  // Test 4: Event listeners and state updates
  it('should update state when service events are fired', () => {
    const { result } = renderHook(() =>
      useBluetoothHRM({ userName: 'test', userAge: 30 })
    )

    // Find the event listener callbacks from the mock calls
    const getListener = (eventName: string) =>
      (mockDeviceManager.addEventListener as jest.Mock).mock.calls.find(
        (call) => call[0] === eventName
      )?.[1]

    const onStatusChanged = getListener('status-changed')
    const onHeartRate = getListener('heart-rate-received')
    const onBattery = getListener('battery-level-received')
    const onDeviceConnected = getListener('device-connected')

    // Simulate status change
    act(() => {
      onStatusChanged(
        new CustomEvent('status-changed', {
          detail: { status: 'connected', message: 'Connected to Test Device' },
        })
      )
    })
    expect(result.current.deviceStatus).toBe('Connected to Test Device')

    // Simulate heart rate update
    act(() => {
      onHeartRate(
        new CustomEvent('heart-rate-received', { detail: { heartRate: 80 } })
      )
    })
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'HRM_INPUT' })
    )

    // Simulate battery level update
    act(() => {
      onBattery(
        new CustomEvent('battery-level-received', {
          detail: { batteryLevel: 90 },
        })
      )
    })
    expect(result.current.batteryLevel).toBe(90)

    // Simulate device connected to save device ID
    act(() => {
      onDeviceConnected(
        new CustomEvent('device-connected', {
          detail: { device: { id: 'test-device-id' } },
        })
      )
    })
    expect(mockSetLastDeviceId).toHaveBeenCalledWith('test-device-id')
  })

  // Test 5: WebSocket disconnected warning
  it('should warn and proceed if WebSocket is not connected', async () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    ;(useWebSocket as jest.Mock).mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Disconnected',
    })
    const { result } = renderHook(() => useBluetoothHRM({}))

    await act(async () => {
      await result.current.connect()
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('WebSocket not connected')
    )
    expect(mockDeviceManager.findAndConnect).toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  // Test 6: Connection failure logging
  it('should log error when connection fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const error = new Error('Connection failed')
    mockDeviceManager.findAndConnect.mockRejectedValueOnce(error)
    const { result } = renderHook(() => useBluetoothHRM({}))

    await act(async () => {
      await result.current.connect()
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      error,
      expect.stringContaining('Failed to connect')
    )
    consoleErrorSpy.mockRestore()
  })

  // Test 7: User cancelled logging
  it('should log info when user cancels connection', async () => {
    const consoleInfoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => {})
    const error = new DOMException('User cancelled', 'NotFoundError')
    mockDeviceManager.findAndConnect.mockRejectedValueOnce(error)
    const { result } = renderHook(() => useBluetoothHRM({}))

    await act(async () => {
      await result.current.connect()
    })

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('User cancelled')
    )
    consoleInfoSpy.mockRestore()
  })

  // Test 8: Forget device
  it('should call service forget when forgetDevice is called', async () => {
    const { result } = renderHook(() => useBluetoothHRM({}))
    await act(async () => {
      await result.current.forgetDevice()
    })
    expect(mockDeviceManager.forget).toHaveBeenCalled()
  })
})
