// File: tests/playwright/lib/bluetooth-mocks.ts
import { Page } from '@playwright/test'

type EventListener = (event: { target: { value: DataView } }) => void

export const injectBluetoothMocks = async (page: Page) => {
  await page.addInitScript(() => {
    // 2. Internal State for the Mock
    const _pairedDevices: MockBluetoothDevice[] = []
    let _connectedDevice: MockBluetoothDevice | null = null

    // 1. Mock Classes
    class MockBluetoothRemoteGATTCharacteristic {
      service: MockBluetoothRemoteGATTService
      value: DataView | null = null
      listeners: { [key: string]: EventListener[] } = {}

      constructor(service: MockBluetoothRemoteGATTService) {
        this.service = service
      }

      async startNotifications() {
        return this
      }

      async stopNotifications() {
        return this
      }

      addEventListener(type: string, listener: EventListener) {
        if (!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(listener)
      }

      // Helper to simulate data arriving
      emitValue(uint8Value: number) {
        const buffer = new ArrayBuffer(2)
        const view = new DataView(buffer)
        view.setUint8(0, 0) // Flags (8-bit)
        view.setUint8(1, uint8Value) // HR Value
        this.value = view

        const event = { target: { value: this.value } }
        if (this.listeners['characteristicvaluechanged']) {
          this.listeners['characteristicvaluechanged'].forEach((l) => l(event))
        }
      }
    }

    class MockBluetoothRemoteGATTService {
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

    class MockBluetoothRemoteGATTServer {
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
        if (this.device.listeners['gattserverdisconnected']) {
          this.device.listeners['gattserverdisconnected'].forEach((l) =>
            l({ target: this.device } as unknown as Event)
          )
        }
      }

      async getPrimaryService(uuid: string) {
        if (!this.connected) throw new Error('GATT Server is disconnected.')
        return new MockBluetoothRemoteGATTService(this.device, uuid)
      }
    }

    class MockBluetoothDevice {
      id: string
      name: string
      gatt: MockBluetoothRemoteGATTServer
      listeners: { [key: string]: ((event: Event) => void)[] } = {}
      _shouldFailConnection = false

      constructor(id: string, name: string) {
        this.id = id
        this.name = name
        this.gatt = new MockBluetoothRemoteGATTServer(this)
      }

      addEventListener(type: string, listener: (event: Event) => void) {
        if (!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(listener)
      }

      async forget() {
        const index = _pairedDevices.findIndex((d) => d.id === this.id)
        if (index > -1) {
          _pairedDevices.splice(index, 1)
        }
      }
    }

    // 3. Mock Navigator.Bluetooth
    const mockBluetooth = {
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
    // @ts-expect-error - Mock is injected in test setup
    navigator.bluetooth = mockBluetooth
    // @ts-expect-error - Mock is injected in test setup
    window.MockBluetoothDevice = MockBluetoothDevice
    // @ts-expect-error - Mock is injected in test setup
    window.bluetoothTestHelpers = {
      simulateHeartRate: (bpm: number) => {
        if (_connectedDevice && _connectedDevice.gatt.connected) {
          // We assume the implementation gets the primary service and characteristic
          // This is a simplification; a real mock might track created services
          const service = new MockBluetoothRemoteGATTService(
            _connectedDevice,
            'heart_rate'
          )
          service.characteristic.emitValue(bpm)
        }
      },
    }
  })
}
