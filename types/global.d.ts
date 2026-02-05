import { Dispatch, SetStateAction } from 'react'
import { SpotifyService } from './interfaces'
import { BluetoothConnectionStatus } from './bluetooth'
import { ServerMessage } from './websocket'

// Define a comprehensive interface for the global test controls
// This allows various parts of the application to attach test-specific
// functions to the window object in a type-safe manner.
export interface TestControls {
  // From useBluetoothHRM hook
  setHrmStatus?: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomHrmStatusMessage?: Dispatch<SetStateAction<string | null>>

  // From WebSocketProvider context
  dispatch?: (message: ServerMessage) => void
  disconnect?: () => void
}

declare global {
  var spotifyService: SpotifyService | undefined

  interface Navigator {
    bluetooth?: Bluetooth
  }

  interface Bluetooth extends EventTarget {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>
    getAvailability(): Promise<boolean>
    getDevices(): Promise<BluetoothDevice[]>
    referringDevice?: BluetoothDevice
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
  }

  type BluetoothServiceUUID = number | string

  interface BluetoothDevice extends EventTarget {
    id: string
    name?: string
    gatt?: BluetoothRemoteGATTServer
    forget(): Promise<void>
    watchAdvertisements(options?: WatchAdvertisementsOptions): Promise<void>
    watchingAdvertisements: boolean
  }

  interface WatchAdvertisementsOptions {
    signal?: AbortSignal
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice
    connected: boolean
    connect(): Promise<BluetoothRemoteGATTServer>
    disconnect(): void
    getPrimaryService(
      service: BluetoothServiceUUID
    ): Promise<BluetoothRemoteGATTService>
    getPrimaryServices(
      service?: BluetoothServiceUUID
    ): Promise<BluetoothRemoteGATTService[]>
  }

  interface BluetoothRemoteGATTService extends EventTarget {
    device: BluetoothDevice
    uuid: string
    isPrimary: boolean
    getCharacteristic(
      characteristic: BluetoothCharacteristicUUID
    ): Promise<BluetoothRemoteGATTCharacteristic>
    getCharacteristics(
      characteristic?: BluetoothCharacteristicUUID
    ): Promise<BluetoothRemoteGATTCharacteristic[]>
  }

  type BluetoothCharacteristicUUID = number | string

  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    service: BluetoothRemoteGATTService
    uuid: string
    properties: BluetoothCharacteristicProperties
    value?: DataView
    getDescriptor(
      descriptor: BluetoothDescriptorUUID
    ): Promise<BluetoothRemoteGATTDescriptor>
    getDescriptors(
      descriptor?: BluetoothDescriptorUUID
    ): Promise<BluetoothRemoteGATTDescriptor[]>
    readValue(): Promise<DataView>
    writeValue(value: BufferSource): Promise<void>
    writeValueWithResponse(value: BufferSource): Promise<void>
    writeValueWithoutResponse(value: BufferSource): Promise<void>
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  }

  type BluetoothDescriptorUUID = number | string

  interface BluetoothRemoteGATTDescriptor {
    characteristic: BluetoothRemoteGATTCharacteristic
    uuid: string
    value?: DataView
    readValue(): Promise<DataView>
    writeValue(value: BufferSource): Promise<void>
  }

  interface BluetoothCharacteristicProperties {
    authenticatedSignedWrites: boolean
    broadcast: boolean
    extendedProperties: boolean
    indicate: boolean
    notify: boolean
    read: boolean
    reliableWrite: boolean
    writableAuxiliaries: boolean
    write: boolean
    writeWithoutResponse: boolean
  }

  interface Window {
    __TEST_READY__?: boolean
    __TEST_WEBSOCKET_READY__?: boolean
    TEST_CONTROLS?: TestControls
  }
}

export {}
