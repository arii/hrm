/**
 * @jest-environment jsdom
 * @file bluetoothDeviceManager.test.ts
 * @description Unit tests for the BluetoothDeviceManager service.
 */

import { BluetoothDeviceManager } from '@/services/bluetoothDeviceManager'
import { DeviceManagerStatus } from '@/services/bluetoothDeviceManager'

// Mock logger
jest.mock('@/utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}))

// Mock Web Bluetooth API
const mockCharacteristic = {
  startNotifications: jest.fn(),
  stopNotifications: jest.fn(),
  readValue: jest
    .fn()
    .mockResolvedValue(new DataView(new Uint8Array([98]).buffer)), // Battery level 98%
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  value: null,
}

const mockPrimaryService = {
  getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
}

const mockGattServer = {
  connect: jest.fn().mockResolvedValue({
    getPrimaryService: jest.fn().mockResolvedValue(mockPrimaryService),
  }),
  disconnect: jest.fn(),
  connected: false,
}

const mockBluetoothDevice = {
  name: 'Test HRM',
  id: '12345',
  gatt: mockGattServer,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}

// Setup global mocks
global.navigator.bluetooth = {
  requestDevice: jest.fn(),
}

describe('BluetoothDeviceManager', () => {
  let deviceManager: BluetoothDeviceManager

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    ;(navigator.bluetooth.requestDevice as jest.Mock).mockResolvedValue(
      mockBluetoothDevice
    )
    mockGattServer.connected = false
    deviceManager = new BluetoothDeviceManager()
  })

  afterEach(() => {
    deviceManager.destroy()
  })

  it('should report supported status correctly', () => {
    expect(deviceManager.isSupported).toBe(true)
  })

  it('should handle successful scan and connect', async () => {
    const statusHistory: { status: DeviceManagerStatus; message: string }[] =
      []
    deviceManager.on(
      'statusChange',
      (status: DeviceManagerStatus, message: string) => {
        statusHistory.push({ status, message })
      }
    )
    mockGattServer.connected = true
    await deviceManager.scanAndConnect()

    expect(navigator.bluetooth.requestDevice).toHaveBeenCalled()
    expect(mockGattServer.connect).toHaveBeenCalled()
    expect(mockCharacteristic.startNotifications).toHaveBeenCalledTimes(2) // HR and Battery

    // Check the sequence of statuses during connection
    expect(statusHistory.map((s) => s.status)).toEqual([
      'scanning',
      'connecting',
      'connected',
    ])
    expect(statusHistory.pop()?.message).toBe('Connected to Test HRM')
  })

  it('should handle user cancelling the scan', async () => {
    const error = new DOMException('User cancelled', 'NotFoundError')
    ;(navigator.bluetooth.requestDevice as jest.Mock).mockRejectedValue(error)

    const statusHistory: { status: DeviceManagerStatus; message: string }[] =
      []
    deviceManager.on(
      'statusChange',
      (status: DeviceManagerStatus, message: string) => {
        statusHistory.push({ status, message })
      }
    )

    await expect(deviceManager.scanAndConnect()).rejects.toThrow(
      'User cancelled'
    )

    expect(statusHistory.find((s) => s.status === 'error')?.message).toBe(
      'Scan cancelled by user.'
    )
  })

  it('should emit heart rate updates', () => {
    const heartRateCallback = jest.fn()
    deviceManager.on('heartRateUpdate', heartRateCallback)
    // @ts-expect-error - private method access for testing
    deviceManager.onHeartRateChanged({
      target: {
        value: new DataView(new Uint8Array([0, 78]).buffer), // 8-bit HR: 78
      },
    })
    expect(heartRateCallback).toHaveBeenCalledWith(78)
  })

  it('should handle disconnection when connected', async () => {
    const statusCallback = jest.fn()
    // Connect the device first
    mockGattServer.connected = true
    await deviceManager.scanAndConnect()
    // Now listen for the disconnect status change
    deviceManager.on('statusChange', statusCallback)
    deviceManager.disconnect()
    expect(mockGattServer.disconnect).toHaveBeenCalled()
    expect(statusCallback).toHaveBeenCalledWith(
      'disconnected',
      'Device disconnected'
    )
  })
})
