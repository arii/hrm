import { jest } from '@jest/globals'

// A helper type for the event listener map
type ListenerMap = {
  [eventName: string]: ((event: Event) => void)[]
}

/**
 * Mocks a BluetoothRemoteGATTCharacteristic object.
 * This is the object that represents a GATT characteristic, which is a basic data element used to construct a GATT service.
 */
export const mockBluetoothGattCharacteristic = (
  overrides: Partial<BluetoothRemoteGATTCharacteristic> = {}
): jest.Mocked<BluetoothRemoteGATTCharacteristic> & {
  _listeners: ListenerMap
  _trigger: (eventName: string, event: Partial<Event>) => void
} => {
  const listeners: ListenerMap = {}

  const characteristicMock =
    {} as jest.Mocked<BluetoothRemoteGATTCharacteristic> & {
      _listeners: ListenerMap
      _trigger: (eventName: string, event: Partial<Event>) => void
    }

  const implementation = {
    startNotifications: jest
      .fn()
      .mockImplementation(() => Promise.resolve(characteristicMock)),
    stopNotifications: jest
      .fn()
      .mockImplementation(() => Promise.resolve(characteristicMock)),
    addEventListener: jest.fn(
      (eventName: string, callback: (event: Event) => void) => {
        if (!listeners[eventName]) {
          listeners[eventName] = []
        }
        listeners[eventName].push(callback)
      }
    ),
    removeEventListener: jest.fn(
      (eventName: string, callback: (event: Event) => void) => {
        if (listeners[eventName]) {
          listeners[eventName] = listeners[eventName].filter(
            (cb) => cb !== callback
          )
        }
      }
    ),
    readValue: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new DataView(new ArrayBuffer(1)))
      ),
    writeValue: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
    ...overrides,
    // Test utilities
    _listeners: listeners,
    _trigger: (eventName: string, event: Partial<Event>) => {
      if (listeners[eventName]) {
        listeners[eventName].forEach((callback) => callback(event as Event))
      }
    },
  }

  Object.assign(characteristicMock, implementation)

  return characteristicMock
}

/**
 * Mocks a BluetoothRemoteGATTService object.
 * This is the object that represents a GATT service, which is a collection of GATT characteristics.
 */
export const mockBluetoothGattService = (
  overrides: Partial<BluetoothRemoteGATTService> = {},
  mockCharacteristic: jest.Mocked<BluetoothRemoteGATTCharacteristic>
): jest.Mocked<BluetoothRemoteGATTService> => {
  const service = {
    getCharacteristic: jest
      .fn()
      .mockImplementation(() => Promise.resolve(mockCharacteristic)),
    ...overrides,
  }
  return service as jest.Mocked<BluetoothRemoteGATTService>
}

/**
 * Mocks a BluetoothRemoteGATTServer object.
 * This is the object that represents a GATT server on a remote Bluetooth device.
 */
export const mockBluetoothRemoteGattServer = (
  overrides: Partial<BluetoothRemoteGATTServer> = {},
  mockService: jest.Mocked<BluetoothRemoteGATTService>
): jest.Mocked<BluetoothRemoteGATTServer> => {
  const gattServer = {
    connect: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
    disconnect: jest.fn(),
    getPrimaryService: jest
      .fn()
      .mockImplementation(() => Promise.resolve(mockService)),
    ...overrides,
  }
  return gattServer as jest.Mocked<BluetoothRemoteGATTServer>
}

/**
 * Mocks a BluetoothDevice object.
 * This is the object that represents a Bluetooth device.
 */
export const mockBluetoothDevice = (
  overrides: Partial<BluetoothDevice> = {},
  mockGattServer: jest.Mocked<BluetoothRemoteGATTServer>
): jest.Mocked<BluetoothDevice> => {
  const device = {
    id: 'test-device-id',
    name: 'Test HRM',
    gatt: {
      ...mockGattServer,
      connected: false,
      connect: jest
        .fn()
        .mockImplementation(() => Promise.resolve(mockGattServer)),
      disconnect: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ...overrides,
  }
  return device as jest.Mocked<BluetoothDevice>
}
