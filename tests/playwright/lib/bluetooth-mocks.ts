/* eslint-disable @typescript-eslint/no-explicit-any */
// File: tests/playwright/lib/bluetooth-mocks.ts
import { Page } from '@playwright/test'

export const injectBluetoothMocks = async (page: Page) => {
  await page.addInitScript(() => {
    // 2. Internal State for the Mock
    const _pairedDevices: any[] = []
    let _connectedDevice: any | null = null

    // 1. Mock Classes
    class MockBluetoothRemoteGATTCharacteristic {
      service: any
      value: DataView | null = null
      listeners: { [key: string]: any[] } = {}

      constructor(service: any) {
        this.service = service
      }

      async startNotifications() {
        return this
      }

      async stopNotifications() {
        return this
      }

      addEventListener(type: string, listener: any) {
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
      device: any
      uuid: string
      characteristic: MockBluetoothRemoteGATTCharacteristic

      constructor(device: any, _uuid: string) {
        this.device = device
        this.uuid = _uuid
        this.characteristic = new MockBluetoothRemoteGATTCharacteristic(this)
      }

      async getCharacteristic(_uuid: string) {
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
          throw new (window as any).DOMException(
            'Connection failed for test',
            'NetworkError'
          )
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
          this.device.listeners['gattserverdisconnected'].forEach((l: any) =>
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
      listeners: { [key: string]: ((event: any) => void)[] } = {}
      _shouldFailConnection = false

      constructor(id: string, name: string) {
        this.id = id
        this.name = name
        this.gatt = new MockBluetoothRemoteGATTServer(this)
      }

      addEventListener(type: string, listener: (event: any) => void) {
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
    const mockBluetooth: any = {
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
    ;(navigator as any).bluetooth = mockBluetooth
    ;(window as any).MockBluetoothDevice = MockBluetoothDevice
    ;(window as any).bluetoothTestHelpers = {
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
