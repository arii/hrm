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
    /**
     * @internal
     * Test-only property to inspect registered event listeners.
     */
    _listeners: listeners,
    /**
     * @internal
     * Test-only utility to simulate a characteristic event.
     * @param eventName - The name of the event to trigger.
     * @param event - The partial event object to dispatch.
     */
    _trigger: (
      eventName: string,
      event: Partial<{ target: Partial<BluetoothRemoteGATTCharacteristic> }>
    ) => {
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
  const gattServerMock = {} as jest.Mocked<BluetoothRemoteGATTServer>

  const implementation = {
    connect: jest
      .fn()
      .mockImplementation(() => Promise.resolve(gattServerMock)),
    disconnect: jest.fn(),
    getPrimaryService: jest
      .fn()
      .mockImplementation(() => Promise.resolve(mockService)),
    connected: false,
    ...overrides,
  }

  Object.assign(gattServerMock, implementation)

  return gattServerMock
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
    gatt: mockGattServer,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ...overrides,
  }
  return device as jest.Mocked<BluetoothDevice>
}
