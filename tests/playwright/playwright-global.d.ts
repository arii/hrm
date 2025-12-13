// tests/playwright/playwright-global.d.ts

// Define a more specific type for the event listener
type MockEventListener = (event: { target: { value: DataView } }) => void;

// Define the interface for the mock characteristic
interface MockBluetoothRemoteGATTCharacteristic {
  service: MockBluetoothRemoteGATTService;
  value: DataView | null;
  listeners: { [key: string]: MockEventListener[] };
  startNotifications(): Promise<this>;
  stopNotifications(): Promise<this>;
  addEventListener(type: string, listener: MockEventListener): void;
  emitValue(uint8Value: number): void;
}

// Define the interface for the mock service
interface MockBluetoothRemoteGATTService {
  device: MockBluetoothDevice;
  uuid: string;
  characteristic: MockBluetoothRemoteGATTCharacteristic;
  getCharacteristic(uuid: string): Promise<MockBluetoothRemoteGATTCharacteristic>;
}

// Define the interface for the mock GATT server
interface MockBluetoothRemoteGATTServer {
  device: MockBluetoothDevice;
  connected: boolean;
  connect(): Promise<this>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<MockBluetoothRemoteGATTService>;
}

// Define the interface for the mock device
interface MockBluetoothDevice {
  id: string;
  name: string;
  gatt: MockBluetoothRemoteGATTServer;
  listeners: { [key: string]: ((event: Event) => void)[] };
  _shouldFailConnection: boolean;
  addEventListener(type: string, listener: (event: Event) => void): void;
  forget(): Promise<void>;
}

declare global {
  interface Window {
    bluetoothTestHelpers?: {
      simulateHeartRate: (bpm: number) => Promise<void>;
    };
    MockBluetoothDevice?: {
      new (id: string, name: string): MockBluetoothDevice;
    };
  }
  interface Navigator {
    bluetooth: {
      getAvailability: () => Promise<boolean>;
      getDevices: () => Promise<MockBluetoothDevice[]>;
      requestDevice: (options: unknown) => Promise<MockBluetoothDevice>;
    };
  }
}

export {};
