// File: tests/playwright/lib/bluetooth-mocks.ts
import { Page } from '@playwright/test'

export const injectBluetoothMocks = async (page: Page) => {
  await page.addInitScript(() => {
    // 1. Internal State for the Mock
    const _pairedDevices: MockBluetoothDevice[] = []
    let _connectedDevice: MockBluetoothDevice | null = null

    // 2. Mock Classes
    class MockBluetoothRemoteGATTCharacteristic
      implements MockBluetoothRemoteGATTCharacteristic
    {
      service: MockBluetoothRemoteGATTService
      value: DataView | null = null
      listeners: { [key: string]: ((event: any) => void)[] } = {}

      constructor(service: MockBluetoothRemoteGATTService) {
        this.service = service
      }

      async startNotifications() {
        return this
      }

      async stopNotifications() {
        return this
      }

      addEventListener(
        type: 'characteristicvaluechanged',
        listener: (event: { target: { value: DataView } }) => void
      ) {
        if (!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(listener)
      }

      emitValue(uint8Value: number) {
        const buffer = new ArrayBuffer(2)
        const view = new DataView(buffer)
        view.setUint8(0, 0) // Flags
        view.setUint8(1, uint8Value) // HR Value
        this.value = view

        const event = { target: { value: this.value } }
        if (this.listeners['characteristicvaluechanged']) {
          this.listeners['characteristicvaluechanged'].forEach((l) => l(event))
        }
      }
    }

    class MockBluetoothRemoteGATTService
      implements MockBluetoothRemoteGATTService
    {
      device: MockBluetoothDevice
      uuid: string
      characteristic: MockBluetoothRemoteGATTCharacteristic

      constructor(device: MockBluetoothDevice, uuid: string) {
        this.device = device
        this.uuid = uuid
        this.characteristic = new MockBluetoothRemoteGATTCharacteristic(this)
      }

      async getCharacteristic(uuid: string) {
        return this.characteristic
      }
    }

    class MockBluetoothRemoteGATTServer
      implements MockBluetoothRemoteGATTServer
    {
      device: MockBluetoothDevice
      connected = false
      private services: Map<string, MockBluetoothRemoteGATTService> = new Map()

      constructor(device: MockBluetoothDevice) {
        this.device = device
      }

      async connect() {
        if (this.device._shouldFailConnection) {
          throw new DOMException('Connection failed for test', 'NetworkError')
        }
        await new Promise((r) => setTimeout(r, 100))
        this.connected = true
        _connectedDevice = this.device

        // Pre-populate the heart_rate service and characteristic
        const hrService = new MockBluetoothRemoteGATTService(
          this.device,
          'heart_rate'
        )
        this.services.set('heart_rate', hrService)

        return this
      }

      disconnect() {
        this.connected = false
        _connectedDevice = null
        if (this.device.listeners['gattserverdisconnected']) {
          this.device.listeners['gattserverdisconnected'].forEach((l) =>
            l({ target: this.device })
          )
        }
      }

      async getPrimaryService(uuid: string) {
        if (!this.connected) throw new Error('GATT Server is disconnected.')
        const service = this.services.get(uuid)
        if (!service) throw new Error(`Service with UUID ${uuid} not found.`)
        return service
      }
    }

    class MockBluetoothDevice implements MockBluetoothDevice {
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

      addEventListener(
        type: 'gattserverdisconnected',
        listener: (event: { target: MockBluetoothDevice }) => void
      ) {
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
    const mockBluetooth: MockBluetooth = {
      getAvailability: async () => true,

      getDevices: async () => {
        return [..._pairedDevices]
      },

      requestDevice: async (options?: any) => {
        const device = new MockBluetoothDevice('mock-device-id-123', 'Mock HRM')
        if (!_pairedDevices.find((d) => d.id === device.id)) {
          _pairedDevices.push(device)
        }
        return device
      },

      _simulateHeartRate: (bpm: number) => {
        if (_connectedDevice && _connectedDevice.gatt.connected) {
          _connectedDevice.gatt
            .getPrimaryService('heart_rate')
            .then((service) => {
              service.characteristic.emitValue(bpm)
            })
        }
      },
    }

    // Inject without ts-ignore
    navigator.bluetooth = mockBluetooth
  })
}
