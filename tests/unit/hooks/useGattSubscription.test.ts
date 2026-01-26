/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import useGattSubscription from '@/hooks/useGattSubscription'
import { mock, mockClear } from 'jest-mock-extended'

// Mock logger
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// Mocks for Web Bluetooth API
const mockHrCharacteristic = mock<BluetoothRemoteGATTCharacteristic>()
const mockBatteryCharacteristic = mock<BluetoothRemoteGATTCharacteristic>()
const mockHrService = mock<BluetoothRemoteGATTService>()
const mockBatteryService = mock<BluetoothRemoteGATTService>()
const mockServer = mock<BluetoothRemoteGATTServer>()

describe('useGattSubscription', () => {
  let onHeartRateUpdate: jest.Mock

  beforeEach(() => {
    onHeartRateUpdate = jest.fn()
    mockClear(mockServer)
    mockClear(mockHrService)
    mockClear(mockBatteryService)
    mockClear(mockHrCharacteristic)
    mockClear(mockBatteryCharacteristic)

    // Setup default mock implementations
    mockServer.connected = true
    mockServer.getPrimaryService.mockImplementation(async (uuid) => {
      if (uuid === 'heart_rate') return mockHrService
      if (uuid === 'battery_service') return mockBatteryService
      throw new Error(`Service ${uuid} not found`)
    })

    mockHrService.getCharacteristic.mockResolvedValue(mockHrCharacteristic)
    mockBatteryService.getCharacteristic.mockResolvedValue(
      mockBatteryCharacteristic
    )

    // Mock battery initial value
    const batteryValue = new DataView(new ArrayBuffer(1))
    batteryValue.setUint8(0, 99)
    mockBatteryCharacteristic.readValue.mockResolvedValue(batteryValue)
  })

  it('should not do anything if server is null', () => {
    const { result } = renderHook(() =>
      useGattSubscription({ server: null, onHeartRateUpdate })
    )
    expect(result.current.batteryLevel).toBeNull()
    expect(result.current.lastDataTimestamp).toBe(0)
    expect(mockServer.getPrimaryService).not.toHaveBeenCalled()
  })

  it('should not do anything if server is not connected', () => {
    mockServer.connected = false
    renderHook(() =>
      useGattSubscription({ server: mockServer, onHeartRateUpdate })
    )
    expect(mockServer.getPrimaryService).not.toHaveBeenCalled()
  })

  it('should subscribe to HR and battery characteristics when server is provided', async () => {
    await act(async () => {
      renderHook(() =>
        useGattSubscription({ server: mockServer, onHeartRateUpdate })
      )
      await new Promise(process.nextTick) // Allow promises to resolve
    })

    expect(mockServer.getPrimaryService).toHaveBeenCalledWith('heart_rate')
    expect(mockHrService.getCharacteristic).toHaveBeenCalledWith(
      'heart_rate_measurement'
    )
    expect(mockHrCharacteristic.startNotifications).toHaveBeenCalled()
    expect(mockHrCharacteristic.addEventListener).toHaveBeenCalledWith(
      'characteristicvaluechanged',
      expect.any(Function)
    )

    expect(mockServer.getPrimaryService).toHaveBeenCalledWith('battery_service')
    expect(mockBatteryService.getCharacteristic).toHaveBeenCalledWith(
      'battery_level'
    )
    expect(mockBatteryCharacteristic.readValue).toHaveBeenCalled()
    expect(mockBatteryCharacteristic.startNotifications).toHaveBeenCalled()
    expect(mockBatteryCharacteristic.addEventListener).toHaveBeenCalledWith(
      'characteristicvaluechanged',
      expect.any(Function)
    )
  })

  it('should handle heart rate updates', async () => {
    let hrCallback: (event: Partial<Event>) => void

    await act(async () => {
      renderHook(() =>
        useGattSubscription({ server: mockServer, onHeartRateUpdate })
      )
      await new Promise(process.nextTick)

      // Capture the event listener
      hrCallback = mockHrCharacteristic.addEventListener.mock.calls.find(
        (call) => call[0] === 'characteristicvaluechanged'
      )?.[1] as (event: Partial<Event>) => void
    })

    const heartRateValue = new DataView(new ArrayBuffer(2))
    heartRateValue.setUint8(0, 0) // 8-bit format
    heartRateValue.setUint8(1, 75) // HR: 75

    act(() => {
      hrCallback({ target: { value: heartRateValue } })
    })

    expect(onHeartRateUpdate).toHaveBeenCalledWith(75)
  })

  it('should handle battery level updates', async () => {
    let batteryCallback: (event: Partial<Event>) => void
    const { result } = renderHook(() =>
      useGattSubscription({ server: mockServer, onHeartRateUpdate })
    )

    await act(async () => {
      await new Promise(process.nextTick)
      batteryCallback =
        mockBatteryCharacteristic.addEventListener.mock.calls.find(
          (call) => call[0] === 'characteristicvaluechanged'
        )?.[1] as (event: Partial<Event>) => void
    })

    expect(result.current.batteryLevel).toBe(99) // Initial value

    const batteryUpdateValue = new DataView(new ArrayBuffer(1))
    batteryUpdateValue.setUint8(0, 80)

    act(() => {
      batteryCallback({ target: { value: batteryUpdateValue } })
    })

    expect(result.current.batteryLevel).toBe(80)
  })

  it('should handle missing battery service gracefully', async () => {
    mockServer.getPrimaryService.mockImplementation(async (uuid) => {
      if (uuid === 'heart_rate') return mockHrService
      throw new Error('Battery service not found')
    })

    await act(async () => {
      renderHook(() =>
        useGattSubscription({ server: mockServer, onHeartRateUpdate })
      )
      await new Promise(process.nextTick)
    })

    // Should still subscribe to HR
    expect(mockHrCharacteristic.startNotifications).toHaveBeenCalled()
    // Should not have failed
    expect(mockBatteryCharacteristic.startNotifications).not.toHaveBeenCalled()
  })

  it('should unsubscribe on unmount', async () => {
    const { unmount } = renderHook(() =>
      useGattSubscription({ server: mockServer, onHeartRateUpdate })
    )

    await act(async () => {
      await new Promise(process.nextTick)
    })

    act(() => {
      unmount()
    })

    // Allow the async cleanup to run
    await act(async () => {
      await new Promise(process.nextTick)
    })

    expect(mockHrCharacteristic.removeEventListener).toHaveBeenCalled()
    expect(mockHrCharacteristic.stopNotifications).toHaveBeenCalled()
    expect(mockBatteryCharacteristic.removeEventListener).toHaveBeenCalled()
    expect(mockBatteryCharacteristic.stopNotifications).toHaveBeenCalled()
  })
})
