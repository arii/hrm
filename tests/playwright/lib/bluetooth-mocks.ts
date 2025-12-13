// File: tests/playwright/lib/bluetooth-mocks.ts
import { Page } from '@playwright/test'

export const injectBluetoothMocks = async (page: Page) => {
  await page.addInitScript(() => {
    // 1. Internal State for the Mock
    // We use a global variable on window to track "paired" devices across reloads if needed,
    // or just local state for this specific page load.
    const _pairedDevices: any[] = []
    let _connectedDevice: any = null

    // 2. Mock Classes
    class MockBluetoothRemoteGATTCharacteristic {
      service: any
      value: DataView | null = null
      listeners: { [key: string]: Function[] } = {}

      constructor(service: any) {
        this.service = service
      }

      async startNotifications() {
        return this
      }

      async stopNotifications() {
        return this
      }

      addEventListener(type: string, listener: Function) {
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
          this.listeners['characteristicvaluechanged'].forEach(l => l(event))
        }
      }
    }

    class MockBluetoothRemoteGATTService {
      device: any
      uuid: string
      characteristic: MockBluetoothRemoteGATTCharacteristic

      constructor(device: any, uuid: string) {
        this.device = device
        this.uuid = uuid
        this.characteristic = new MockBluetoothRemoteGATTCharacteristic(this)
      }

      async getCharacteristic(uuid: string) {
        return this.characteristic
      }
    }

    class MockBluetoothRemoteGATTServer {
      device: any
      connected = false

      constructor(device: any) {
        this.device = device
      }

      async connect() {
        if (this.device._shouldFailConnection) {
          throw new DOMException('Connection failed for test', 'NetworkError')
        }
        // Simulate a slight delay
        await new Promise(r => setTimeout(r, 100))
        this.connected = true
        _connectedDevice = this.device
        return this
      }

      disconnect() {
        this.connected = false
        _connectedDevice = null
        // Trigger disconnection listener on device
        if (this.device.listeners['gattserverdisconnected']) {
          this.device.listeners['gattserverdisconnected'].forEach((l: any) => l({ target: this.device }))
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
      listeners: { [key: string]: Function[] } = {}
      _shouldFailConnection = false

      constructor(id: string, name: string) {
        this.id = id
        this.name = name
        this.gatt = new MockBluetoothRemoteGATTServer(this)
      }

      addEventListener(type: string, listener: Function) {
        if (!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(listener)
      }

      async forget() {
        const index = _pairedDevices.findIndex(d => d.id === this.id)
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

      requestDevice: async (options: any) => {
        // Simulate user selecting a device
        const device = new MockBluetoothDevice('mock-device-id-123', 'Mock HRM')

        // Check if we already have it?
        // For simplicity, just add it to paired list
        if (!_pairedDevices.find(d => d.id === device.id)) {
          _pairedDevices.push(device)
        }
        return device
      },

      // Helper for tests to trigger HR updates
      _simulateHeartRate: (bpm: number) => {
        if (_connectedDevice && _connectedDevice.gatt.connected) {
           // We assume the implementation gets the primary service and characteristic
           // This is a simplification; a real mock might track created services
           const service = new MockBluetoothRemoteGATTService(_connectedDevice, 'heart_rate')
           service.characteristic.emitValue(bpm)
        }
      }
    }

    // Inject
    // @ts-ignore
    navigator.bluetooth = mockBluetooth
  })
}