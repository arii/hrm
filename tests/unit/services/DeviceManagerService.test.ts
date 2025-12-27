/**
 * @jest-environment jsdom
 * @file DeviceManagerService.test.ts
 * @description Unit tests for the DeviceManagerService class.
 * This test suite mocks the Web Bluetooth API to test the service's logic
 * for device connection, data handling, and lifecycle management in isolation.
 */

import DeviceManagerService from '@/services/DeviceManagerService'
import {
  mockBluetoothDevice,
  mockCharacteristic,
  resetMocks,
} from '../mocks/bluetooth'

// Mock the global navigator.bluetooth object before each test
beforeEach(() => {
  resetMocks()
  Object.defineProperty(window.navigator, 'bluetooth', {
    writable: true,
    value: {
      requestDevice: jest.fn().mockResolvedValue(mockBluetoothDevice),
      getDevices: jest.fn().mockResolvedValue([mockBluetoothDevice]),
    },
  })
})

describe('DeviceManagerService', () => {
  let service: DeviceManagerService

  beforeEach(() => {
    service = new DeviceManagerService({
      dataLivenessTimeoutMs: 5000,
      reconnectIntervalMs: 1000,
    })
  })

  afterEach(() => {
    service.disconnect() // Ensure cleanup after each test
  })

  // Test 1: Successful connection and setup
  it('should connect to a device and set up services and characteristics', async () => {
    const statusChangedCallback = jest.fn()
    service.addEventListener('status-changed', statusChangedCallback)

    await service.findAndConnect()

    expect(navigator.bluetooth.requestDevice).toHaveBeenCalled()
    expect(mockBluetoothDevice.gatt!.connect).toHaveBeenCalled()
    expect(mockBluetoothDevice.gatt!.getPrimaryService).toHaveBeenCalledWith(
      'heart_rate'
    )
    expect(
      (await mockBluetoothDevice.gatt!.getPrimaryService()).getCharacteristic
    ).toHaveBeenCalledWith('heart_rate_measurement')
    expect(mockCharacteristic.startNotifications).toHaveBeenCalled()
    expect(service.device).toBe(mockBluetoothDevice)
  })

  // Test 2: Heart rate notifications
  it('should receive and parse heart rate notifications', async () => {
    const heartRateCallback = jest.fn()
    service.addEventListener('heart-rate-received', heartRateCallback)

    await service.findAndConnect()

    const event = new Event('characteristicvaluechanged')
    const dataView = new DataView(new ArrayBuffer(2))
    dataView.setUint8(0, 0)
    dataView.setUint8(1, 75)
    Object.defineProperty(event, 'target', {
      writable: false,
      value: { value: dataView },
    })

    // Dispatch the event on the mock characteristic
    mockCharacteristic.dispatchEvent(event)

    expect(heartRateCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { heartRate: 75 },
      })
    )
  })

  // Test 3: Disconnection
  it('should handle manual disconnection correctly', async () => {
    const disconnectedCallback = jest.fn()
    service.addEventListener('device-disconnected', disconnectedCallback)
    await service.findAndConnect()
    service.disconnect()

    expect(mockBluetoothDevice.gatt!.disconnect).toHaveBeenCalled()
    expect(service.device).toBeNull()
    expect(disconnectedCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { reason: 'manual', device: mockBluetoothDevice },
      })
    )
  })

  // Test 4: Signal loss and auto-reconnection
  it('should attempt to reconnect after a signal loss', async () => {
    jest.useFakeTimers()
    const statusChangedCallback = jest.fn()
    service.addEventListener('status-changed', statusChangedCallback)

    await service.findAndConnect()
    ;(mockBluetoothDevice.gatt!.connect as jest.Mock).mockClear()

    // Simulate gattserverdisconnected event by calling disconnect on the gatt server
    mockBluetoothDevice.gatt!.disconnect()

    // Fast-forward time to trigger the reconnect timeout
    jest.advanceTimersByTime(1000)
    await Promise.resolve() // Allow promises to settle

    expect(statusChangedCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { status: 'connecting', message: 'Signal Lost. Retrying...' },
      })
    )
    expect(mockBluetoothDevice.gatt!.connect).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  // Test 5: Connection failure
  it('should handle connection failures gracefully', async () => {
    const statusChangedCallback = jest.fn()
    ;(navigator.bluetooth.requestDevice as jest.Mock).mockRejectedValue(
      new DOMException('User cancelled', 'NotFoundError')
    )
    service.addEventListener('status-changed', statusChangedCallback)

    await expect(service.findAndConnect()).rejects.toThrow('User cancelled')

    expect(statusChangedCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          status: 'error',
          message: 'Connection cancelled. No device selected.',
        },
      })
    )
    expect(service.device).toBeNull()
  })
})
