/**
 * @jest-environment jsdom
 * @file useBluetoothHRM.test.ts
 * @description Unit tests for the refactored useBluetoothHRM hook.
 * This suite tests the hook's ability to interact with the mocked
 * DeviceManagerService and manage its own state correctly.
 */

import { renderHook, act } from '@testing-library/react'
import { useBluetoothHRM } from '@/hooks/useBluetoothHRM'
import { jest } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import useLocalStorage from '@/hooks/useLocalStorage'

// Mock DeviceManagerService
const mockDeviceManager = {
  findAndConnect: jest.fn(),
  disconnect: jest.fn(),
  forget: jest.fn(),
  updateOptions: jest.fn(),
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
