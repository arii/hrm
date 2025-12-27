/**
 * @jest-environment jsdom
 * @file bluetoothDeviceManager.test.ts
 * @description Unit tests for the BluetoothDeviceManager service.
 */

import { act } from '@testing-library/react'
import { BluetoothDeviceManager } from '@/services/bluetoothDeviceManager'
import { DeviceManagerStatus } from '@/services/bluetoothDeviceManager'
import * as cookieService from '@/services/cookieService'

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

let mockDeviceEventListeners: {
  [key: string]: jest.Mock<any, any, any>
} = {}

const mockBluetoothDevice = {
  name: 'Test HRM',
  id: '12345',
  gatt: mockGattServer,
  addEventListener: jest.fn((event, callback) => {
    mockDeviceEventListeners[event] = jest.fn(callback)
  }),
  removeEventListener: jest.fn((event, callback) => {
    if (mockDeviceEventListeners[event] === callback) {
      delete mockDeviceEventListeners[event]
    }
  }),
  forget: jest.fn().mockResolvedValue(undefined),
}

// Helper to simulate event dispatch
const simulateDeviceEvent = (event: string, ...args: any[]) => {
  if (mockDeviceEventListeners[event]) {
    mockDeviceEventListeners[event](...args)
  }
}

// Setup global mocks
global.navigator.bluetooth = {
  requestDevice: jest.fn(),
  getDevices: jest.fn(),
}

describe('BluetoothDeviceManager', () => {
  let deviceManager: BluetoothDeviceManager

  beforeEach(() => {
    jest.useFakeTimers()
    // Reset all mocks before each test
    jest.clearAllMocks()
    mockDeviceEventListeners = {}
    ;(navigator.bluetooth.requestDevice as jest.Mock).mockResolvedValue(
      mockBluetoothDevice
    )
    ;(navigator.bluetooth.getDevices as jest.Mock).mockResolvedValue([])
    mockGattServer.connected = false
    deviceManager = new BluetoothDeviceManager()
  })

  afterEach(() => {
    deviceManager.destroy()
    jest.useRealTimers()
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
    await deviceManager.connect()

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

    await expect(deviceManager.connect()).rejects.toThrow('User cancelled')

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
    await deviceManager.connect()

    // Now listen for the disconnect status change
    deviceManager.on('statusChange', statusCallback)

    // Manually call disconnect
    deviceManager.disconnect()

    expect(mockGattServer.disconnect).toHaveBeenCalled()
    // The disconnect event handler will be called, updating the status
    act(() => {
      simulateDeviceEvent('gattserverdisconnected')
    })
    expect(statusCallback).toHaveBeenCalledWith(
      'disconnected',
      'Device disconnected'
    )
  })

  it('should attempt to reconnect to a saved device', async () => {
    const getCookieSpy = jest
      .spyOn(cookieService, 'getCookie')
      .mockReturnValue('12345')
    ;(navigator.bluetooth.getDevices as jest.Mock).mockResolvedValue([
      mockBluetoothDevice,
    ])

    await deviceManager.connect()

    expect(getCookieSpy).toHaveBeenCalledWith('hrm_device_id')
    expect(navigator.bluetooth.getDevices).toHaveBeenCalled()
    expect(navigator.bluetooth.requestDevice).not.toHaveBeenCalled()
    expect(mockGattServer.connect).toHaveBeenCalled()
  })

  it('should forget a device', async () => {
    const setCookieSpy = jest
      .spyOn(cookieService, 'setCookie')
      .mockImplementation(() => {}) // Mock implementation to avoid jsdom errors
    mockGattServer.connected = true

    // We must connect via requestDevice to have a "forgettable" device
    await deviceManager.connect()
    expect(mockBluetoothDevice.name).toBe('Test HRM') // Sanity check

    await deviceManager.forgetDevice()

    expect(mockBluetoothDevice.forget).toHaveBeenCalled()
    expect(setCookieSpy).toHaveBeenCalledWith('hrm_device_id', '', -1)
  })

  it('should auto-reconnect on unexpected disconnection', async () => {
    mockGattServer.connected = true
    await deviceManager.connect()

    // @ts-expect-error - spy on private method
    const reconnectSpy = jest.spyOn(deviceManager, 'connectGatt')
    reconnectSpy.mockResolvedValue() // prevent actual connection logic

    // Simulate the gattserverdisconnected event
    act(() => {
      simulateDeviceEvent('gattserverdisconnected')
    })

    // Fast-forward timers to trigger reconnect logic
    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    expect(reconnectSpy).toHaveBeenCalled()
  })

  it('should trigger watchdog and reconnect', async () => {
    mockGattServer.connected = true
    await deviceManager.connect()

    // @ts-expect-error - spy on private method
    const reconnectSpy = jest.spyOn(deviceManager, 'connectGatt')
    reconnectSpy.mockResolvedValue()

    // Fast-forward timers to trigger watchdog
    await act(async () => {
      // Watchdog timeout is 10s, interval is 5s. 16s ensures it runs.
      jest.advanceTimersByTime(16000)
    })

    // Watchdog should call disconnect
    expect(mockGattServer.disconnect).toHaveBeenCalled()

    // Simulate the disconnect event, which should then trigger the reconnect logic
    act(() => {
      simulateDeviceEvent('gattserverdisconnected')
    })

    // Fast-forward timers to allow reconnect to be called
    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    expect(reconnectSpy).toHaveBeenCalled()
  })
})
