/**
 * @file tests/unit/lib/bluetooth-test-utils.ts
 * @description Reusable test utility for mocking the Web Bluetooth API in Jest.
 *
 * This utility creates a comprehensive mock of the navigator.bluetooth API,
 * allowing for the simulation of device discovery, connection, disconnection,

 */
import { jest } from '@jest/globals'

/**
 * Creates a mock of a Bluetooth GATT characteristic.
 * @returns A mock characteristic object.
 */
const createMockCharacteristic = () => ({
  startNotifications: jest.fn().mockResolvedValue(undefined),
  stopNotifications: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  writeValue: jest.fn().mockResolvedValue(undefined),
  readValue: jest.fn().mockResolvedValue(new DataView(new ArrayBuffer(1))),
  service: null, // This will be set by the service mock
  uuid: '00002a37-0000-1000-8000-00805f9b34fb', // Heart Rate Measurement
  properties: {
    broadcast: false,
    read: false,
    writeWithoutResponse: false,
    write: false,
    notify: true,
    indicate: false,
    authenticatedSignedWrites: false,
    reliableWrite: false,
    writableAuxiliaries: false,
  },
  value: null,
})

/**
 * Creates a mock of a Bluetooth GATT primary service.
 * @param characteristic - The mock characteristic to be returned by this service.
 * @returns A mock service object.
 */
const createMockService = (characteristic: ReturnType<typeof createMockCharacteristic>) => ({
  getCharacteristic: jest.fn().mockResolvedValue(characteristic),
  device: null, // This will be set by the GATT server mock
  uuid: '0000180d-0000-1000-8000-00805f9b34fb', // Heart Rate Service
})

/**
 * Creates a mock of a Bluetooth GATT server.
 * @param service - The mock service to be returned by this server.
 * @returns A mock GATT server object.
 */
const createMockGattServer = (service: ReturnType<typeof createMockService>) => ({
  connect: jest.fn().mockResolvedValue({
    getPrimaryService: jest.fn().mockResolvedValue(service),
  }),
  disconnect: jest.fn(),
  getPrimaryService: jest.fn().mockResolvedValue(service),
  connected: false,
})

/**
 * Creates a mock of a Bluetooth device.
 * @param gattServer - The mock GATT server to be associated with this device.
 * @param deviceId - The device ID.
 * @param deviceName - The device name.
 * @returns A mock device object.
 */
const createMockDevice = (
  gattServer: ReturnType<typeof createMockGattServer>,
  deviceId = 'test-device-id',
  deviceName = 'Test HRM'
) => ({
  id: deviceId,
  name: deviceName,
  gatt: gattServer,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  forget: jest.fn().mockResolvedValue(undefined),
})

/**
 * Sets up a complete mock of the navigator.bluetooth API.
 * @returns An object containing all the mock parts for easy access in tests.
 */
export const setupBluetoothMocks = () => {
  const mockHrCharacteristic = createMockCharacteristic()
  const mockBatteryCharacteristic = createMockCharacteristic()
  const mockHrService = createMockService(mockHrCharacteristic)
  const mockBatteryService = createMockService(mockBatteryCharacteristic)
  const mockGattServer = createMockGattServer(mockHrService)
  const mockDevice = createMockDevice(mockGattServer)

  // Assign back-references
  mockHrCharacteristic.service = mockHrService as any
  mockBatteryCharacteristic.service = mockBatteryService as any
  mockHrService.device = mockDevice as any
  mockBatteryService.device = mockDevice as any
  ;(mockGattServer as any).device = mockDevice

  // Mock getPrimaryService to return the correct service based on the UUID
  mockGattServer.getPrimaryService.mockImplementation((uuid: string) => {
    if (uuid === 'heart_rate') {
      return Promise.resolve(mockHrService)
    }
    if (uuid === 'battery_service') {
      return Promise.resolve(mockBatteryService)
    }
    return Promise.reject(new Error(`Service not found: ${uuid}`))
  })

  const mockBluetooth = {
    requestDevice: jest.fn().mockResolvedValue(mockDevice),
    getDevices: jest.fn().mockResolvedValue([]),
    getAvailability: jest.fn().mockResolvedValue(true),
  }

  // Define the property on the navigator object
  Object.defineProperty(navigator, 'bluetooth', {
    value: mockBluetooth,
    writable: true,
    configurable: true,
  })

  return {
    mockBluetooth,
    mockDevice,
    mockGattServer,
    mockHrService,
    mockBatteryService,
    mockHrCharacteristic,
    mockBatteryCharacteristic,
  }
}

/**
 * Simulates a battery level notification from the mock device.
 * @param mockCharacteristic - The mock characteristic to emit the value from.
 * @param batteryLevel - The battery level to simulate.
 */
export const simulateBatteryLevelNotification = (
  mockCharacteristic: ReturnType<typeof createMockCharacteristic>,
  batteryLevel: number
) => {
  const eventListener = mockCharacteristic.addEventListener.mock.calls[0][1]

  if (eventListener) {
    const buffer = new ArrayBuffer(1)
    const view = new DataView(buffer)
    view.setUint8(0, batteryLevel)

    const event = {
      target: {
        value: view,
      },
    }
    eventListener(event)
  }
}

/**
 * Simulates a heart rate notification from the mock device.
 * @param mockCharacteristic - The mock characteristic to emit the value from.
 * @param heartRate - The heart rate value to simulate.
 */
export const simulateHeartRateNotification = (
  mockCharacteristic: ReturnType<typeof createMockCharacteristic>,
  heartRate: number
) => {
  const eventListener = mockCharacteristic.addEventListener.mock.calls[0][1]

  if (eventListener) {
    const buffer = new ArrayBuffer(2)
    const view = new DataView(buffer)
    view.setUint8(0, 0) // Flags
    view.setUint8(1, heartRate) // Heart Rate

    const event = {
      target: {
        value: view,
      },
    }
    eventListener(event)
  }
}

/**
 * Simulates a device disconnection event.
 * @param mockDevice - The mock device that is disconnecting.
 */
export const simulateDisconnection = (mockDevice: ReturnType<typeof createMockDevice>) => {
  const eventListener = mockDevice.addEventListener.mock.calls.find(
    (call) => call[0] === 'gattserverdisconnected'
  )
  if (eventListener && typeof eventListener[1] === 'function') {
    eventListener[1]({ target: mockDevice })
  }
}
