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
import { setCookie, getCookie } from './cookieService'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'
const HRM_COOKIE_NAME = 'hrm_device_id'

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
  private watchdogTimer: NodeJS.Timeout | null = null
  private lastDataTime: number = 0
  private manualDisconnect: boolean = false

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
   * @method connect
   * @description Attempts to connect to a device, either by re-establishing a connection
   * to a known device or by initiating a scan for a new one.
   * @async
   */
  async connect(): Promise<void> {
    if (!this.isSupported) {
      this.setStatus('error', 'Bluetooth not supported')
      return
    }
    if (this.status === 'connected' || this.status === 'connecting') {
      logger.warn('Connection attempt while already connected/connecting.')
      return
    }

    try {
      this.manualDisconnect = false
      this.abortController = new AbortController()
      const savedDeviceId = getCookie(HRM_COOKIE_NAME)
      let deviceToConnect: BluetoothDevice | null = null

      if (savedDeviceId && navigator.bluetooth?.getDevices) {
        this.setStatus('scanning', 'Checking for saved devices...')
        const devices = await navigator.bluetooth.getDevices()
        deviceToConnect = devices.find((d) => d.id === savedDeviceId) || null
      }

      if (deviceToConnect) {
        this.device = deviceToConnect
        await this.connectGatt()
      } else {
        await this.scanForNewDevice()
      }
    } catch (error) {
      const errorMessage =
        error instanceof DOMException && error.name === 'NotFoundError'
          ? 'Scan cancelled by user.'
          : `Connection failed: ${(error as Error).message}`
      this.setStatus('error', errorMessage)
      logger.error({ error }, 'Error during connection process')
      this.reset()
      throw error
    }
  }

  private async scanForNewDevice(): Promise<void> {
    this.setStatus('scanning', 'Requesting Bluetooth device...')
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HR_SERVICE_UUID] }],
      optionalServices: [BATTERY_SERVICE_UUID],
    })

    if (!this.device) {
      throw new Error('No device selected')
    }
    await this.connectGatt()
  }

  private async connectGatt(): Promise<void> {
    if (!this.device) return

    this.device.addEventListener(
      'gattserverdisconnected',
      this.onDisconnected,
      { once: true }
    )

    try {
      this.setStatus('connecting', `Connecting to ${this.device.name}...`)

      const server = await cancellablePromise(
        this.device.gatt!.connect(),
        {
          timeoutMs: 15000,
          errorMessage: 'GATT connection timeout',
        },
        this.abortController?.signal
      )

      const hrService = await server.getPrimaryService(HR_SERVICE_UUID)
      const hrCharacteristic = await hrService.getCharacteristic(
        HR_CHARACTERISTIC_UUID
      )
      await hrCharacteristic.startNotifications()
      hrCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.onHeartRateChanged
      )

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

      setCookie(HRM_COOKIE_NAME, this.device.id)
      this.setStatus('connected', `Connected to ${this.device.name}`)
      this.startWatchdog()
    } catch (error) {
      this.reset()
      throw error
    }
  }

  private onHeartRateChanged = (event: Event): void => {
    this.lastDataTime = Date.now()
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
    this.stopWatchdog()
    this.setStatus('disconnected', 'Device disconnected')
    this.reset(this.manualDisconnect) // Reset state. If manual, clear device.
    if (!this.manualDisconnect) {
      this.reconnect()
    }
  }

  private reconnect(): void {
    if (this.status === 'connecting' || this.status === 'connected') {
      return
    }
    this.setStatus('connecting', 'Reconnecting...')
    setTimeout(() => {
      this.connectGatt().catch((error) => {
        logger.error({ error }, 'Failed to reconnect')
        this.setStatus('error', 'Reconnection failed')
      })
    }, 2000)
  }

  disconnect(): void {
    this.manualDisconnect = true
    if (!this.device) return
    this.abortController?.abort()
    if (this.device.gatt?.connected) {
      this.device.gatt.disconnect()
    } else {
      this.onDisconnected()
    }
  }

  async forgetDevice(): Promise<void> {
    const deviceToForget = this.device
    this.disconnect()
    setCookie(HRM_COOKIE_NAME, '', -1)
    try {
      if (deviceToForget?.forget) {
        await deviceToForget.forget()
      }
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget')
    }
    this.setStatus('disconnected', 'Device forgotten')
  }

  private startWatchdog(): void {
    this.lastDataTime = Date.now()
    this.watchdogTimer = setInterval(() => {
      if (Date.now() - this.lastDataTime > 10000) {
        logger.warn('Watchdog triggered: no data received. Reconnecting...')
        if (this.device?.gatt?.connected) {
          this.manualDisconnect = false // Ensure it's treated as an auto-reconnect
          this.device.gatt.disconnect()
        }
      }
    }, 5000) // Check more frequently
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }

  private reset(clearDevice = true): void {
    this.stopWatchdog()
    if (this.device) {
      this.device.removeEventListener(
        'gattserverdisconnected',
        this.onDisconnected
      )
      if (clearDevice) this.device = null
    }
    this.abortController = null
  }

  destroy(): void {
    this.disconnect()
    this.removeAllListeners()
  }
}
