/**
 * @file bluetoothDeviceManager.ts
 * @description This service encapsulates all interactions with the Web Bluetooth API
 * for connecting to and managing Heart Rate Monitor (HRM) devices. It is designed
 * to be used as a singleton within a React context or hook to provide a stable
 * interface to the underlying hardware.
 */

import { cancellablePromise } from '@/utils/promise'
import logger from '@/utils/logger'
import { EventEmitter } from 'events'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

/**
 * @function parseHeartRate
 * @description Parses the heart rate value from the raw DataView received from a BLE device.
 * @param {DataView} value - The raw data from the heart rate measurement characteristic.
 * @returns {number} The parsed heart rate in beats per minute.
 */
const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}

/**
 * @type DeviceManagerStatus
 * @description Represents the various states of the Bluetooth device manager.
 */
export type DeviceManagerStatus =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error'

/**
 * @interface BluetoothDeviceManagerEventMap
 * @description Defines the events emitted by the BluetoothDeviceManager.
 */
interface BluetoothDeviceManagerEventMap {
  statusChange: (status: DeviceManagerStatus, message: string) => void
  heartRateUpdate: (heartRate: number) => void
  batteryLevelUpdate: (level: number) => void
  error: (error: Error) => void
}

/**
 * @class BluetoothDeviceManager
 * @extends EventEmitter
 * @description Manages Bluetooth device connections and data streaming for HRM sensors.
 * This class handles the full lifecycle of a device: scanning, connecting, monitoring,
 * and disconnecting, while emitting events to notify consumers of changes.
 *
 * @fires statusChange - When the connection status changes.
 * @fires heartRateUpdate - When a new heart rate measurement is received.
 * @fires batteryLevelUpdate - When a new battery level is received.
 * @fires error - When a significant error occurs.
 */
export class BluetoothDeviceManager extends EventEmitter {
  private device: BluetoothDevice | null = null
  private abortController: AbortController | null = null
  private status: DeviceManagerStatus = 'disconnected'

  constructor() {
    super()
  }

  /**
   * @method isSupported
   * @description Checks if the browser supports the Web Bluetooth API.
   * @returns {boolean} True if the API is available.
   */
  get isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.bluetooth !== 'undefined'
    )
  }

  /**
   * @method emit
   * @description Overrides the default EventEmitter.emit to provide strong typing.
   */
  emit<E extends keyof BluetoothDeviceManagerEventMap>(
    event: E,
    ...args: Parameters<BluetoothDeviceManagerEventMap[E]>
  ): boolean {
    return super.emit(event, ...args)
  }

  /**
   * @method on
   * @description Overrides the default EventEmitter.on to provide strong typing.
   */
  on<E extends keyof BluetoothDeviceManagerEventMap>(
    event: E,
    listener: BluetoothDeviceManagerEventMap[E]
  ): this {
    return super.on(event, listener)
  }

  private setStatus(status: DeviceManagerStatus, message: string): void {
    this.status = status
    this.emit('statusChange', this.status, message)
  }

  /**
   * @method scanAndConnect
   * @description Initiates a Bluetooth scan for HRM devices and connects to the selected one.
   * @async
   * @throws {Error} If the scan is cancelled or fails.
   */
  async scanAndConnect(): Promise<void> {
    if (!this.isSupported) {
      this.setStatus('error', 'Bluetooth not supported')
      return
    }
    if (this.status === 'connected' || this.status === 'connecting') {
      logger.warn('Connection attempt while already connected/connecting.')
      return
    }

    this.abortController = new AbortController()

    try {
      this.setStatus('scanning', 'Requesting Bluetooth device...')
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE_UUID] }],
        optionalServices: [BATTERY_SERVICE_UUID],
      })

      if (!this.device) {
        throw new Error('No device selected')
      }

      this.device.addEventListener(
        'gattserverdisconnected',
        this.onDisconnected
      )
      await this.connectGatt()
    } catch (error) {
      const errorMessage =
        error instanceof DOMException && error.name === 'NotFoundError'
          ? 'Scan cancelled by user.'
          : `Scan failed: ${(error as Error).message}`
      this.setStatus('error', errorMessage)
      logger.error({ error }, 'Error during device scan and connect')
      this.reset()
      throw error // Re-throw to allow UI to handle it
    }
  }

  private async connectGatt(): Promise<void> {
    if (!this.device) return

    try {
      this.setStatus('connecting', `Connecting to ${this.device.name}...`)

      const server = await cancellablePromise(this.device.gatt!.connect(), {
        timeoutMs: 15000,
        errorMessage: 'GATT connection timeout',
        signal: this.abortController?.signal,
      })

      // Heart Rate Service
      const hrService = await server.getPrimaryService(HR_SERVICE_UUID)
      const hrCharacteristic = await hrService.getCharacteristic(
        HR_CHARACTERISTIC_UUID
      )
      await hrCharacteristic.startNotifications()
      hrCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.onHeartRateChanged
      )

      // Battery Service (optional)
      try {
        const batteryService =
          await server.getPrimaryService(BATTERY_SERVICE_UUID)
        const batteryCharacteristic = await batteryService.getCharacteristic(
          BATTERY_LEVEL_CHARACTERISTIC_UUID
        )
        const batteryValue = await batteryCharacteristic.readValue()
        this.onBatteryLevelChanged(batteryValue)
        await batteryCharacteristic.startNotifications()
        batteryCharacteristic.addEventListener(
          'characteristicvaluechanged',
          (e: Event) =>
            this.onBatteryLevelChanged(
              (e.target as BluetoothRemoteGATTCharacteristic).value!
            )
        )
      } catch (e) {
        logger.warn('Battery service not found, skipping.')
      }

      this.setStatus('connected', `Connected to ${this.device.name}`)
    } catch (error) {
      const errorMessage = `Connection to ${this.device.name} failed: ${
        (error as Error).message
      }`
      this.setStatus('error', errorMessage)
      logger.error({ error }, 'Error during GATT connection')
      this.reset()
      throw error
    }
  }

  private onHeartRateChanged = (event: Event): void => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const value = target.value!
    const heartRate = parseHeartRate(value)
    this.emit('heartRateUpdate', heartRate)
  }

  private onBatteryLevelChanged = (value: DataView): void => {
    const batteryLevel = value.getUint8(0)
    this.emit('batteryLevelUpdate', batteryLevel)
  }

  private onDisconnected = (): void => {
    this.setStatus('disconnected', 'Device disconnected')
    this.reset(false) // Keep device reference for potential reconnect
  }

  /**
   * @method disconnect
   * @description Disconnects from the currently connected device.
   */
  disconnect(): void {
    if (!this.device || !this.device.gatt) {
      this.onDisconnected()
      return
    }
    this.abortController?.abort()
    if (this.device.gatt.connected) {
      this.device.gatt.disconnect()
    } else {
      this.onDisconnected()
    }
    this.reset()
  }

  private reset(clearDevice = true): void {
    if (this.device) {
      this.device.removeEventListener(
        'gattserverdisconnected',
        this.onDisconnected
      )
      if (clearDevice) {
        this.device = null
      }
    }
    if (this.abortController) {
      this.abortController = null
    }
  }

  /**
   * @method destroy
   * @description Cleans up all resources and listeners. Used for testing.
   */
  destroy(): void {
    this.disconnect()
    this.removeAllListeners()
  }
}
