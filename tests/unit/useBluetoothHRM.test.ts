/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import deviceManager from '@/services/deviceManager'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// Mock the DeviceManager service
jest.mock('@/services/deviceManager', () => ({
  on: jest.fn(),
  off: jest.fn(),
  connectAndStream: jest.fn(),
  disconnect: jest.fn(),
  forgetDevice: jest.fn(),
}))

describe('useBluetoothHRM', () => {
  let mockSendData: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    mockSendData = jest.fn()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('should call deviceManager.connectAndStream on connect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await act(async () => {
      await result.current.connectAndStream()
    })
    expect(deviceManager.connectAndStream).toHaveBeenCalled()
  })

  it('should call deviceManager.disconnect on disconnect', () => {
    const { result } = renderHook(() => useBluetoothHRM())
    act(() => {
      result.current.disconnect()
    })
    expect(deviceManager.disconnect).toHaveBeenCalled()
  })

  it('should call deviceManager.forgetDevice on forgetDevice', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await act(async () => {
      await result.current.forgetDevice()
    })
    expect(deviceManager.forgetDevice).toHaveBeenCalled()
  })

  it('should update state when deviceManager emits events', () => {
    const { result } = renderHook(() => useBluetoothHRM())

    // Simulate events from the device manager
    act(() => {
      // Find the event handler passed to deviceManager.on
      const onStatusChange = (deviceManager.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'statusChange'
      )?.[1]
      onStatusChange('Connected to: Test Device')
    })
    expect(result.current.deviceStatus).toBe('Connected to: Test Device')
    expect(result.current.isConnected).toBe(true)

    act(() => {
      const onBatteryLevel = (deviceManager.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'batteryLevel'
      )?.[1]
      onBatteryLevel(99)
    })
    expect(result.current.batteryLevel).toBe(99)
  })

  it('should send throttled heart rate data', () => {
    const { result } = renderHook(() => useBluetoothHRM({ throttleMs: 500 }))

    act(() => {
      const onHeartRate = (deviceManager.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'heartRate'
      )?.[1]
      onHeartRate(80)
      onHeartRate(81)
    })

    expect(mockSendData).toHaveBeenCalledTimes(1) // Only one call due to throttle

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(mockSendData).toHaveBeenCalledTimes(2) // Second call after timeout
  })
})
