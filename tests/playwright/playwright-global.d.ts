// tests/playwright/playwright-global.d.ts

// Define a more specific type for the event listener
type MockEventListener = (event: { target: { value: DataView } }) => void

// Define the interface for the mock characteristic
interface MockBluetoothRemoteGATTCharacteristic {
  service: MockBluetoothRemoteGATTService
  value: DataView | null
  listeners: { [key: string]: MockEventListener[] }
  startNotifications(): Promise<this>
  stopNotifications(): Promise<this>
  addEventListener(type: string, listener: MockEventListener): void
  emitValue(uint8Value: number): void
}

// Define the interface for the mock service
interface MockBluetoothRemoteGATTService {
  device: MockBluetoothDevice
  uuid: string
  characteristic: MockBluetoothRemoteGATTCharacteristic
  getCharacteristic(
    uuid: string
  ): Promise<MockBluetoothRemoteGATTCharacteristic>
}

// Define the interface for the mock GATT server
interface MockBluetoothRemoteGATTServer {
  device: MockBluetoothDevice
  connected: boolean
  connect(): Promise<this>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<MockBluetoothRemoteGATTService>
}

// Define the interface for the mock device
interface MockBluetoothDevice {
  id: string
  name: string
  gatt: MockBluetoothRemoteGATTServer
  listeners: { [key: string]: ((event: Event) => void)[] }
  _shouldFailConnection: boolean
  addEventListener(type: string, listener: (event: Event) => void): void
  forget(): Promise<void>
}

declare global {
  interface Window {
    // This is defined in types/global.d.ts but we need to ensure Playwright sees it compatible
    // or we can remove it if we can share the types. For now, let's keep it compatible
    // by allowing additional properties (index signature or just optional props)
    // Actually, let's remove the conflicting strict definition and rely on the app's types if possible,
    // but Playwright runs in a separate context.
    // The safest fix for the conflict is to match the TestControls interface structure or use 'any'.
    __TEST_CONTROLS__?: {
      dispatch?: (message: unknown) => void
      disconnect?: () => void
      connect?: () => void
      [key: string]: unknown // Allow other properties like setHrmStatus
    }
    bluetoothTestHelpers?: {
      simulateHeartRate: (bpm: number) => Promise<void>
    }
    MockBluetoothDevice?: {
      new (id: string, name: string): MockBluetoothDevice
    }
  }
  interface Navigator {
    bluetooth: {
      getAvailability: () => Promise<boolean>
      getDevices: () => Promise<MockBluetoothDevice[]>
      requestDevice: (options: unknown) => Promise<MockBluetoothDevice>
    }
  }
}

export {}
