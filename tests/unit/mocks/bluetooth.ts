/**
 * @file bluetooth.ts
 * @description Mocks for the Web Bluetooth API.
 * This file provides a set of Jest mocks for Bluetooth-related objects
 * like `BluetoothDevice`, `BluetoothRemoteGATTServer`, etc. It allows for
 * simulating Bluetooth interactions in a Node.js environment for unit tests.
 */

class MockEventTarget {
  private listeners: {
    [key: string]: Array<(event: Event) => void>
  } = {}

  addEventListener(
    type: string,
    listener: (event: Event) => void,
    _options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(listener)
  }

  removeEventListener(
    type: string,
    listener: (event: Event) => void,
    _options?: boolean | EventListenerOptions
  ): void {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener)
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners[event.type]
    if (listeners) {
      listeners.forEach((listener) => listener.call(this, event))
      return true
    }
    return false
  }

  // Helper to clear all listeners
  clearEventListeners(): void {
    this.listeners = {}
  }
}

// Mock for BluetoothRemoteGATTCharacteristic
class MockGATTCharacteristic extends MockEventTarget {
  uuid = 'heart_rate_measurement'
  startNotifications = jest.fn().mockResolvedValue(undefined)
  stopNotifications = jest.fn().mockResolvedValue(undefined)
  readValue = jest.fn().mockResolvedValue(new DataView(new ArrayBuffer(1)))
  writeValue = jest.fn().mockResolvedValue(undefined)
  value: DataView | null = null
}

// Mock for BluetoothRemoteGATTService
class MockGATTService extends MockEventTarget {
  getCharacteristic = jest.fn().mockResolvedValue(new MockGATTCharacteristic())
}

// Mock for BluetoothRemoteGATTServer
class MockGATTServer extends MockEventTarget {
  connected = false
  connect = jest.fn().mockImplementation(function (this: MockGATTServer) {
    this.connected = true
    return Promise.resolve(this)
  })
  disconnect = jest.fn().mockImplementation(function (this: MockGATTServer) {
    this.connected = false
    // Simulate the 'gattserverdisconnected' event being fired on the device
    mockBluetoothDevice.dispatchEvent(new Event('gattserverdisconnected'))
  })
  getPrimaryService = jest.fn().mockResolvedValue(new MockGATTService())
}

// Mock for BluetoothDevice
class MockBluetoothDevice extends MockEventTarget {
  id = 'test-device-id'
  name = 'Test HRM'
  gatt: MockGATTServer | null = new MockGATTServer()
  forget = jest.fn().mockResolvedValue(undefined)

  constructor() {
    super()
    // Link gatt's disconnect to dispatching an event on this device
    if (this.gatt) {
      this.gatt.disconnect = this.gatt.disconnect.bind(this.gatt)
    }
  }
}

export let mockCharacteristic = new MockGATTCharacteristic()
export let mockPrimaryService = new MockGATTService()
export let mockGattServer = new MockGATTServer()
export let mockBluetoothDevice = new MockBluetoothDevice()

/**
 * @function resetMocks
 * @description Resets all mock objects and their functions to a clean state.
 */
export const resetMocks = (): void => {
  mockCharacteristic = new MockGATTCharacteristic()
  mockPrimaryService = new MockGATTService()
  mockGattServer = new MockGATTServer()
  mockBluetoothDevice = new MockBluetoothDevice()

  // Re-link the mockGattServer's getPrimaryService to resolve with our singleton mockPrimaryService
  mockGattServer.getPrimaryService.mockResolvedValue(mockPrimaryService)
  // Re-link the mockPrimaryService's getCharacteristic to resolve with our singleton mockCharacteristic
  mockPrimaryService.getCharacteristic.mockResolvedValue(mockCharacteristic)

  // Link the device's gatt property to the singleton gatt mock
  mockBluetoothDevice.gatt = mockGattServer
}
