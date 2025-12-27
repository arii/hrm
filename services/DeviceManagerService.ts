/**
 * @file DeviceManagerService.ts
 * @description This service encapsulates all interactions with the Web Bluetooth API
 * for connecting to and managing Bluetooth Low Energy (BLE) devices, specifically
 * Heart Rate Monitors (HRMs). It provides a clean, event-driven interface for
 * consumers (like React hooks) to use, abstracting away the raw platform APIs.
 */

import logger from '@/utils/logger'
import { cancellablePromise } from '@/utils/promise'

// Bluetooth GATT Service and Characteristic UUIDs
const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

/**
 * @typedef {'disconnected' | 'connecting' | 'connected' | 'error'} DeviceConnectionStatus
 * @description Represents the current connection status of the Bluetooth device.
 */
export type DeviceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

/**
 * @typedef {'manual' | 'timeout' | 'signal_loss'} DisconnectionReason
 * @description The reason for a device disconnection event.
 */
export type DisconnectionReason = 'manual' | 'timeout' | 'signal_loss'

/**
 * @interface DeviceManagerEventMap
 * @description Defines the events that can be emitted by the DeviceManagerService.
 * This allows for strongly-typed event listeners.
 */
interface DeviceManagerEventMap {
  'status-changed': { status: DeviceConnectionStatus; message: string }
  'heart-rate-received': { heartRate: number }
  'battery-level-received': { batteryLevel: number }
  'device-disconnected': {
    reason: DisconnectionReason
    device: BluetoothDevice
  }
  'device-connected': { device: BluetoothDevice }
}
/**
 * @interface DeviceManagerOptions
 * @description Configuration options for the DeviceManagerService instance.
 */
export interface DeviceManagerOptions {
  /**
   * @property {number} [dataLivenessTimeoutMs=10000]
   * @description Timeout in ms for data staleness. If no new data is received
   * within this period, it triggers a reconnection attempt. 0 disables it.
   */
  dataLivenessTimeoutMs?: number
  /**
   * @property {number} [reconnectIntervalMs=2000]
   * @description Delay in ms before attempting to reconnect after an unexpected disconnection.
   */
  reconnectIntervalMs?: number
}

/**
 * @class DeviceManagerService
 * @description A class to manage Bluetooth device connections and data.
 * It handles device discovery, connection, data parsing, and automatic reconnection.
 *
 * @event status-changed - Fired when the connection status changes.
 * @event heart-rate-received - Fired when a new heart rate measurement is received.
 * @event battery-level-received - Fired when a battery level update is received.
 * @event device-disconnected - Fired when the device disconnects for any reason.
 * @event device-connected - Fired when a device connection is successfully established.
 */
class DeviceManagerService extends EventTarget {
  public device: BluetoothDevice | null = null
  private abortController: AbortController | null = null
  private options: Required<DeviceManagerOptions>
  private lastDataTime: number = 0
  private watchdogInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isManualDisconnect: boolean = false
  private hrCharacteristic: BluetoothRemoteGATTCharacteristic | null = null
  private batteryCharacteristic: BluetoothRemoteGATTCharacteristic | null = null

  /**
   * @constructor
   * @param {DeviceManagerOptions} [options={}] - Configuration for the service.
   */
  constructor(options: DeviceManagerOptions = {}) {
    super()
    this.options = {
      dataLivenessTimeoutMs: options.dataLivenessTimeoutMs ?? 10000,
      reconnectIntervalMs: options.reconnectIntervalMs ?? 2000,
    }
  }

  // Type-safe event listener overrides
  public addEventListener<K extends keyof DeviceManagerEventMap>(
    type: K,
    listener: (event: CustomEvent<DeviceManagerEventMap[K]>) => void,
    options?: boolean | AddEventListenerOptions
  ): void
  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void
  public addEventListener(
    type: string,
    listener:
      | EventListenerOrEventListenerObject
      | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | ((event: any) => void),
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options
    )
  }

  public removeEventListener<K extends keyof DeviceManagerEventMap>(
    type: K,
    listener: (event: CustomEvent<DeviceManagerEventMap[K]>) => void,
    options?: boolean | EventListenerOptions
  ): void
  public removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void
  public removeEventListener(
    type: string,
    listener:
      | EventListenerOrEventListenerObject
      | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | ((event: any) => void),
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options
    )
  }

  private emit<K extends keyof DeviceManagerEventMap>(
    type: K,
    detail: DeviceManagerEventMap[K]
  ): boolean {
    return super.dispatchEvent(new CustomEvent(type, { detail }))
  }

  private parseHeartRate(value: DataView): number {
    const flags = value.getUint8(0)
    const is16Bit = flags & 0x1
    return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
  }

  /**
   * @method findAndConnect
   * @description Prompts the user to select a Bluetooth device and connects to it.
   * @async
   * @throws {Error} If connection fails.
   */
  public async findAndConnect(): Promise<void> {
    this.emit('status-changed', {
      status: 'connecting',
      message: 'Requesting Bluetooth device...',
    })
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE_UUID] }],
        optionalServices: [BATTERY_SERVICE_UUID],
      })
      await this.connectToDevice(device)
    } catch (error) {
      this.handleConnectionError(error)
      throw error
    }
  }

  /**
   * @method connectToDevice
   * @description Connects to a previously known BluetoothDevice object.
   * @param {BluetoothDevice} deviceToConnect - The device to connect to.
   * @async
   * @throws {Error} If connection fails.
   */
  public async connectToDevice(
    deviceToConnect: BluetoothDevice
  ): Promise<void> {
    this.cleanup() // Ensure clean state before connecting
    this.isManualDisconnect = false
    this.device = deviceToConnect
    this.abortController = new AbortController()
    this.device.addEventListener(
      'gattserverdisconnected',
      this.onGattServerDisconnected
    )
    await this.connectToGattServer()
  }

  private async connectToGattServer(): Promise<void> {
    if (!this.device) throw new Error('No device to connect to.')

    try {
      this.emit('status-changed', {
        status: 'connecting',
        message: `Connecting to ${this.device.name}...`,
      })

      const cancelOptions = {
        timeoutMs: 15000,
        errorMessage: 'GATT connection timeout',
        ...(this.abortController?.signal
          ? { signal: this.abortController.signal }
          : {}),
      }

      const server = await cancellablePromise(
        this.device.gatt!.connect(),
        cancelOptions
      )

      const hrService = await server.getPrimaryService(HR_SERVICE_UUID)
      this.hrCharacteristic = await hrService.getCharacteristic(
        HR_CHARACTERISTIC_UUID
      )
      this.hrCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.onHeartRateChanged
      )
      await this.hrCharacteristic.startNotifications()
      this.lastDataTime = Date.now()
      this.startWatchdog()

      try {
        const batteryService =
          await server.getPrimaryService(BATTERY_SERVICE_UUID)
        this.batteryCharacteristic = await batteryService.getCharacteristic(
          BATTERY_LEVEL_CHARACTERISTIC_UUID
        )
        const batteryValue = await this.batteryCharacteristic.readValue()
        this.onBatteryLevelChangedValue(batteryValue)
        this.batteryCharacteristic.addEventListener(
          'characteristicvaluechanged',
          this.onBatteryLevelChangedEvent
        )
        await this.batteryCharacteristic.startNotifications()
      } catch {
        logger.warn('Battery service not found. Skipping.')
      }

      this.emit('status-changed', {
        status: 'connected',
        message: `Connected to ${this.device.name}`,
      })
      this.emit('device-connected', { device: this.device })
    } catch (error) {
      this.handleConnectionError(error)
      throw error
    }
  }

  public disconnect(): void {
    this.isManualDisconnect = true
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)

    if (this.device?.gatt?.connected) {
      // This will trigger the onGattServerDisconnected handler, which calls cleanup
      this.device.gatt.disconnect()
    } else {
      // If not connected, just clean up state and emit events
      const disconnectedDevice = this.device
      this.cleanup()
      if (disconnectedDevice) {
        this.emit('device-disconnected', {
          reason: 'manual',
          device: disconnectedDevice,
        })
      }
      this.emit('status-changed', {
        status: 'disconnected',
        message: 'Disconnected',
      })
    }
  }

  private cleanup(): void {
    this.stopWatchdog()
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    this.abortController?.abort()
    this.device?.removeEventListener(
      'gattserverdisconnected',
      this.onGattServerDisconnected
    )
    if (this.hrCharacteristic) {
      this.hrCharacteristic.removeEventListener(
        'characteristicvaluechanged',
        this.onHeartRateChanged
      )
      this.hrCharacteristic = null
    }
    if (this.batteryCharacteristic) {
      this.batteryCharacteristic.removeEventListener(
        'characteristicvaluechanged',
        this.onBatteryLevelChangedEvent
      )
      this.batteryCharacteristic = null
    }

    this.device = null
    this.abortController = null
  }

  // Watchdog for stale data
  private startWatchdog(): void {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval)
    if (this.options.dataLivenessTimeoutMs === 0) return

    this.watchdogInterval = setInterval(() => {
      if (Date.now() - this.lastDataTime > this.options.dataLivenessTimeoutMs) {
        logger.warn('Bluetooth data stale. Forcing reconnection...')
        this.emit('status-changed', {
          status: 'connecting',
          message: 'Connection unstable. Reconnecting...',
        })
        if (this.device?.gatt?.connected) {
          // This will trigger the onGattServerDisconnected handler
          this.device.gatt.disconnect()
        }
      }
    }, 2000)
  }

  private stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval)
      this.watchdogInterval = null
    }
  }

  // --- Event Handlers ---
  private onGattServerDisconnected = (): void => {
    const disconnectedDevice = this.device!
    const reason: DisconnectionReason = this.isManualDisconnect
      ? 'manual'
      : 'signal_loss'

    this.cleanup()
    this.emit('device-disconnected', {
      reason,
      device: disconnectedDevice,
    })

    if (reason !== 'manual' && disconnectedDevice) {
      this.emit('status-changed', {
        status: 'connecting',
        message: 'Signal Lost. Retrying...',
      })
      this.reconnectTimeout = setTimeout(() => {
        logger.info(
          { device: disconnectedDevice.name },
          'Attempting auto-reconnect...'
        )
        this.connectToDevice(disconnectedDevice).catch((error) => {
          logger.error(
            { error, device: disconnectedDevice.name },
            'Auto-reconnect failed'
          )
        })
      }, this.options.reconnectIntervalMs)
    } else {
      this.emit('status-changed', {
        status: 'disconnected',
        message: 'Disconnected',
      })
    }
  }

  private onHeartRateChanged = (event: Event): void => {
    this.lastDataTime = Date.now()
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const heartRate = this.parseHeartRate(target.value!)
    this.emit('heart-rate-received', { heartRate })
  }

  private onBatteryLevelChangedEvent = (event: Event): void => {
    this.onBatteryLevelChangedValue(
      (event.target as BluetoothRemoteGATTCharacteristic).value!
    )
  }

  private onBatteryLevelChangedValue = (value: DataView): void => {
    const batteryLevel = value.getUint8(0)
    this.emit('battery-level-received', { batteryLevel })
  }

  private handleConnectionError = (error: unknown): void => {
    let message = 'An unknown connection error occurred.'
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') {
        message = 'Connection cancelled. No device selected.'
      } else if (error.name === 'NetworkError') {
        message = 'Connection failed. Device is out of range.'
      } else {
        message = `Bluetooth error: ${error.name}`
      }
    } else if (error instanceof Error) {
      message = error.message
    }
    this.emit('status-changed', { status: 'error', message })
    this.cleanup()
  }
}

export default DeviceManagerService
