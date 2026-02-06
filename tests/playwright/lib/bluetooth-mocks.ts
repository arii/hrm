// File: tests/playwright/lib/bluetooth-mocks.ts
import { Page } from '@playwright/test'

export const injectBluetoothMocks = async (page: Page) => {
  await page.addInitScript(() => {
    // 2. Internal State for the Mock
    const _pairedDevices: MockBluetoothDevice[] = []
    let _connectedDevice: MockBluetoothDevice | null = null

    // 1. Mock Classes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type MockListener = (event: any) => void

    class MockEventEmitter {
      listeners: { [key: string]: MockListener[] } = {}

      addEventListener(type: string, listener: MockListener) {
        if (!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(listener)
      }

      removeEventListener(type: string, listener: MockListener) {
        if (this.listeners[type]) {
          const index = this.listeners[type].indexOf(listener)
          if (index > -1) {
            this.listeners[type].splice(index, 1)
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatchEvent(type: string, event: any) {
        if (this.listeners[type]) {
          this.listeners[type].forEach((l) => l(event))
        }
      }
    }

    class MockBluetoothRemoteGATTCharacteristic
      extends MockEventEmitter
      implements MockBluetoothRemoteGATTCharacteristic
    {
      service: MockBluetoothRemoteGATTService
      value: DataView | null = null

      constructor(service: MockBluetoothRemoteGATTService) {
        super()
        this.service = service
      }

      async startNotifications() {
        return this
      }

      async stopNotifications() {
        return this
      }

      // Helper to simulate data arriving
      emitValue(uint8Value: number) {
        const buffer = new ArrayBuffer(2)
        const view = new DataView(buffer)
        view.setUint8(0, 0) // Flags (8-bit)
        view.setUint8(1, uint8Value) // HR Value
        this.value = view

        const event = { target: { value: this.value } }
        this.dispatchEvent('characteristicvaluechanged', event)
      }
    }

    class MockBluetoothRemoteGATTService implements MockBluetoothRemoteGATTService {
      device: MockBluetoothDevice
      uuid: string
      characteristic: MockBluetoothRemoteGATTCharacteristic

      constructor(device: MockBluetoothDevice, _uuid: string) {
        this.device = device
        this.uuid = _uuid
        this.characteristic = new MockBluetoothRemoteGATTCharacteristic(this)
      }

      async getCharacteristic(_uuid: string) {
        return this.characteristic
      }
    }

    class MockBluetoothRemoteGATTServer implements MockBluetoothRemoteGATTServer {
      device: MockBluetoothDevice
      connected = false

      constructor(device: MockBluetoothDevice) {
        this.device = device
      }

      async connect() {
        if (this.device._shouldFailConnection) {
          throw new DOMException('Connection failed for test', 'NetworkError')
        }
        // Simulate a slight delay
        await new Promise((r) => setTimeout(r, 100))
        this.connected = true
        _connectedDevice = this.device
        return this
      }

      disconnect() {
        this.connected = false
        _connectedDevice = null
        // Trigger disconnection listener on device
        this.device.dispatchEvent('gattserverdisconnected', {
          target: this.device,
        })
      }

      async getPrimaryService(uuid: string) {
        if (!this.connected) throw new Error('GATT Server is disconnected.')
        return new MockBluetoothRemoteGATTService(this.device, uuid)
      }
    }

    class MockBluetoothDevice
      extends MockEventEmitter
      implements MockBluetoothDevice
    {
      id: string
      name: string
      gatt: MockBluetoothRemoteGATTServer
      _shouldFailConnection = false

      constructor(id: string, name: string) {
        super()
        this.id = id
        this.name = name
        this.gatt = new MockBluetoothRemoteGATTServer(this)
      }

      async forget() {
        const index = _pairedDevices.findIndex((d) => d.id === this.id)
        if (index > -1) {
          _pairedDevices.splice(index, 1)
        }
      }
    }

    // 3. Mock Navigator.Bluetooth
    const mockBluetooth: Navigator['bluetooth'] = {
      getAvailability: async () => true,

      getDevices: async () => {
        return [..._pairedDevices]
      },

      requestDevice: async (_options: unknown) => {
        // Simulate user selecting a device
        const device = new MockBluetoothDevice('mock-device-id-123', 'Mock HRM')

        // Check if we already have it?
        // For simplicity, just add it to paired list
        if (!_pairedDevices.find((d) => d.id === device.id)) {
          _pairedDevices.push(device)
        }
        return device
      },
    }

    // Inject
    Object.defineProperty(navigator, 'bluetooth', {
      value: mockBluetooth,
      writable: true,
    })
    window.MockBluetoothDevice = MockBluetoothDevice
    window.bluetoothTestHelpers = {
      simulateHeartRate: async (bpm: number) => {
        if (_connectedDevice && _connectedDevice.gatt.connected) {
          // Simulate the app's actual retrieval path
          const service =
            await _connectedDevice.gatt.getPrimaryService('heart_rate')
          service.characteristic.emitValue(bpm)
        }
      },
    }
  })
}
