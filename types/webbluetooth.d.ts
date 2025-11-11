// File: types/webbluetooth.d.ts (Web Bluetooth API Type Definitions)
interface Navigator {
  bluetooth: Bluetooth
}

interface Bluetooth {
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>
  getDevices(): Promise<BluetoothDevice[]>
  // Add other Web Bluetooth API interfaces as needed
}

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[]
  optionalServices?: BluetoothServiceUUID[]
  acceptAllDevices?: boolean
}

interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[]
  name?: string
  namePrefix?: string
  // Add other filter options as needed
}

type BluetoothServiceUUID = number | string
type BluetoothCharacteristicUUID = number | string
type BluetoothDescriptorUUID = number | string

interface BluetoothDevice {
  id: string
  name?: string
  gatt?: BluetoothRemoteGATTServer
  forget(): Promise<void>
  addEventListener(
    type: 'gattserverdisconnected',
    listener: (event: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void
  removeEventListener(
    type: 'gattserverdisconnected',
    listener: (event: Event) => void,
    options?: boolean | EventListenerOptions
  ): void
  // Add other properties and methods as needed
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(
    service: BluetoothServiceUUID
  ): Promise<BluetoothRemoteGATTService>
  // Add other methods as needed
}

interface BluetoothRemoteGATTService {
  getCharacteristic(
    characteristic: BluetoothCharacteristicUUID
  ): Promise<BluetoothRemoteGATTCharacteristic>
  // Add other methods as needed
}

interface BluetoothRemoteGATTCharacteristic {
  readValue(): Promise<DataView>
  value?: DataView // Add this line
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void
  removeEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: Event) => void,
    options?: boolean | EventListenerOptions
  ): void
  // Add other properties and methods as needed
}
