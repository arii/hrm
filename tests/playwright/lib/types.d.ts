// File: tests/playwright/lib/types.d.ts

// We use `interface` with no members for forward declaration.
// This is a common pattern for defining complex, interdependent types.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MockBluetoothDevice {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MockBluetoothRemoteGATTService {}

// Type for the mock characteristic, representing a GATT characteristic.
interface MockBluetoothRemoteGATTCharacteristic {
  readonly service: MockBluetoothRemoteGATTService
  value: DataView | null
  listeners: { [key: string]: ((event: Event) => void)[] }
  startNotifications(): Promise<this>
  stopNotifications(): Promise<this>
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: { target: { value: DataView } }) => void
  ): void
  emitValue(uint8Value: number): void
}

// Type for the mock service, representing a GATT service.
interface MockBluetoothRemoteGATTService {
  readonly device: MockBluetoothDevice
  readonly uuid: string
  characteristic: MockBluetoothRemoteGATTCharacteristic
  getCharacteristic(
    uuid: string
  ): Promise<MockBluetoothRemoteGATTCharacteristic>
}

// Type for the mock GATT server.
interface MockBluetoothRemoteGATTServer {
  readonly device: MockBluetoothDevice
  connected: boolean
  connect(): Promise<this>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<MockBluetoothRemoteGATTService>
}

// Type for the mock Bluetooth device.
interface MockBluetoothDevice {
  readonly id: string
  readonly name: string
  gatt: MockBluetoothRemoteGATTServer
  listeners: { [key: string]: ((event: Event) => void)[] }
  _shouldFailConnection: boolean
  addEventListener(
    type: 'gattserverdisconnected',
    listener: (event: { target: MockBluetoothDevice }) => void
  ): void
  forget(): Promise<void>
}

// The main interface for our entire mock Bluetooth object.
interface MockBluetooth {
  getAvailability(): Promise<boolean>
  getDevices(): Promise<MockBluetoothDevice[]>
  requestDevice(options?: unknown): Promise<MockBluetoothDevice>
}

// Extend the global Navigator interface to include our custom mock.
// This teaches TypeScript that `navigator.bluetooth` can have our mock's shape.
interface Navigator {
  bluetooth: MockBluetooth
}

// Extend the global Window interface to include our custom mock instance.
interface Window {
  mockBluetoothInstance: {
    _getConnectedDevice: () => MockBluetoothDevice | null
  }
}
