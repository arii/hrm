/**
 * @file DeviceManagerService.ts
 * @description This service encapsulates all interactions with the Web Bluetooth API
 * for connecting to and managing Bluetooth Low Energy (BLE) devices, specifically
 * Heart Rate Monitors (HRMs). It provides a clean, event-driven interface for
 * consumers (like React hooks) to use, abstracting away the raw platform APIs.
 */

import logger from '@/utils/logger'
import { cancellablePromise } from '@/utils/promise'
import {
  HR_SERVICE_UUID,
  HR_CHARACTERISTIC_UUID,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_CHARACTERISTIC_UUID,
} from '@/constants/bluetooth'

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

export type DeviceManagerEvent<K extends keyof DeviceManagerEventMap> =
  CustomEvent<DeviceManagerEventMap[K]>

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
  sendData?: (data: unknown) => void
  serviceUUID?: string
  characteristicUUID?: string
}

/**
 * @interface BluetoothDeviceWithForget
 * @description Interface extending BluetoothDevice to include the experimental forget method.
 */
interface BluetoothDeviceWithForget extends BluetoothDevice {
  forget(): Promise<void>
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
  /**
   * The currently connected Bluetooth device.
   * @public
   * @type {(BluetoothDevice | null)}
   */
  public async getPreviouslyConnectedDevice(
    deviceId: string
  ): Promise<BluetoothDevice | null> {
    if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return null
    try {
      const permittedDevices = await navigator.bluetooth.getDevices()
      return permittedDevices.find((d) => d.id === deviceId) || null
    } catch (error) {
      logger.error(
        { error },
        'Failed to retrieve list of permitted Bluetooth devices.'
      )
      throw error
    }
  }
  public device: BluetoothDevice | null = null
  private abortController: AbortController | null = null
  private options: Required<DeviceManagerOptions>
  private lastDataTime: number = 0
  private watchdogInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isManualDisconnect: boolean = false
  private isDisconnecting: boolean = false
  private hrCharacteristic: BluetoothRemoteGATTCharacteristic | null = null
  private batteryCharacteristic: BluetoothRemoteGATTCharacteristic | null = null

  /**
   * Creates an instance of DeviceManagerService.
   * @param {Partial<DeviceManagerOptions>} [options={}] - Configuration for the service.
   * @memberof DeviceManagerService
   */
  constructor(options: Partial<DeviceManagerOptions> = {}) {
    super()
    this.options = {
      dataLivenessTimeoutMs: options.dataLivenessTimeoutMs ?? 10000,
      reconnectIntervalMs: options.reconnectIntervalMs ?? 2000,
      sendData: options.sendData ?? (() => {}),
      serviceUUID: options.serviceUUID ?? HR_SERVICE_UUID,
      characteristicUUID:
        options.characteristicUUID ?? HR_CHARACTERISTIC_UUID,
    }
  }

  /**
   * Updates the service options.
   * @param {Partial<DeviceManagerOptions>} newOptions - The new options to apply.
   * @memberof DeviceManagerService
   */
  public updateOptions(newOptions: Partial<DeviceManagerOptions>): void {
    this.options = { ...this.options, ...newOptions }
    if (this.watchdogInterval) {
      this.stopWatchdog()
      this.startWatchdog()
    }
  }

  /**
   * Type-safe event listener overrides.
   * @template K
   * @param {K} type - The event type.
   * @param {(((event: CustomEvent<DeviceManagerEventMap[K]>) => void) | null)} listener - The event listener.
   * @param {(boolean | AddEventListenerOptions)} [options] - The event listener options.
   * @memberof DeviceManagerService
   */
  public addEventListener<K extends keyof DeviceManagerEventMap>(
    type: K,
    listener: ((event: CustomEvent<DeviceManagerEventMap[K]>) => void) | null,
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
      | ((event: any) => void), // 'any' required for compatibility with CustomEvent overrides
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options
    )
  }

  /**
   * Type-safe event listener overrides.
   * @template K
   * @param {K} type - The event type.
   * @param {(((event: CustomEvent<DeviceManagerEventMap[K]>) => void) | null)} listener - The event listener.
   * @param {(boolean | EventListenerOptions)} [options] - The event listener options.
   * @memberof DeviceManagerService
   */
  public removeEventListener<K extends keyof DeviceManagerEventMap>(
    type: K,
    listener: ((event: CustomEvent<DeviceManagerEventMap[K]>) => void) | null,
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
      | ((event: any) => void), // 'any' required for compatibility with CustomEvent overrides
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options
    )
  }

  /**
   * Emits a custom event.
   * @private
   * @template K
   * @param {K} type - The event type.
   * @param {DeviceManagerEventMap[K]} detail - The event detail.
   * @returns {boolean}
   * @memberof DeviceManagerService
   */
  private emit<K extends keyof DeviceManagerEventMap>(
    type: K,
    detail: DeviceManagerEventMap[K]
  ): boolean {
    return super.dispatchEvent(new CustomEvent(type, { detail }))
  }

  /**
   * Parses the heart rate value from the Bluetooth device.
   * @private
   * @param {DataView} value - The data view from the characteristic.
   * @returns {number} The heart rate.
   * @memberof DeviceManagerService
   */
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
    let device: BluetoothDevice
    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.options.serviceUUID] }],
        optionalServices: [BATTERY_SERVICE_UUID],
      })
    } catch (error) {
      this.handleConnectionError(error, 'requestDevice')
      throw error
    }
    await this.connectToDevice(device)
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
    if (this.isDisconnecting) {
      throw new Error('Device is disconnecting. Please wait.')
    }
    this.cleanup() // Ensure clean state before connecting
    this.isManualDisconnect = false
    this.device = deviceToConnect
    this.abortController = new AbortController()
    this.device.addEventListener(
      'gattserverdisconnected',
      this.onGattServerDisconnected
    )
    try {
      await this.connectToGattServer()
    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  /**
   * Forgets the device and cleans up resources.
   * @public
   * @returns {Promise<void>}
   * @memberof DeviceManagerService
   */
  public async forget(): Promise<void> {
    if (!this.device) return

    // Feature detection for experimental API
    if (
      'forget' in this.device &&
      typeof (this.device as BluetoothDeviceWithForget).forget === 'function'
    ) {
      try {
        await (this.device as BluetoothDeviceWithForget).forget()
      } catch (error) {
        logger.error({ error }, 'Error forgetting device')
        throw error
      }
    } else {
      logger.warn('Device.forget() is not supported in this browser.')
    }

    this.cleanup()
  }

  private async connectToGattServer(): Promise<void> {
    if (!this.device) throw new Error('No device to connect to.')

    try {
      this.emit('status-changed', {
        status: 'connecting',
        message: `Connecting to ${this.device.name}...`,
      })

      const cancelOptions: {
        timeoutMs: number
        errorMessage: string
        signal?: AbortSignal
      } = {
        timeoutMs: 15000,
        errorMessage: 'GATT connection timeout',
      }
      if (this.abortController?.signal) {
        cancelOptions.signal = this.abortController.signal
      }

      const server = await cancellablePromise(
        this.device.gatt!.connect(),
        cancelOptions
      )

      const hrService = await server.getPrimaryService(this.options.serviceUUID)
      this.hrCharacteristic = await hrService.getCharacteristic(
        this.options.characteristicUUID
      )
      this.hrCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.onHeartRateChanged
      )
      await this.hrCharacteristic.startNotifications()
      this.lastDataTime = performance.now()
      this.startWatchdog()

      await this.setupBatteryService(server)

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

  private async setupBatteryService(
    server: BluetoothRemoteGATTServer
  ): Promise<void> {
    try {
      const batteryService =
        await server.getPrimaryService(BATTERY_SERVICE_UUID)
      this.batteryCharacteristic = await batteryService.getCharacteristic(
        BATTERY_LEVEL_CHARACTERISTIC_UUID
      )
      this.batteryCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.onBatteryLevelChangedEvent
      )
      await this.batteryCharacteristic.startNotifications()

      const value = await this.batteryCharacteristic.readValue()
      this.onBatteryLevelChangedValue(value)
    } catch (error) {
      // Battery service is optional
      logger.warn({ error }, 'Battery service not available')
    }
  }

  /**
   * Disconnects from the device and cleans up resources.
   * @public
   * @memberof DeviceManagerService
   */
  public disconnect(): void {
    if (this.isDisconnecting) return
    this.isManualDisconnect = true
    this.isDisconnecting = true
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

    // Ensure any pending connection attempt is cancelled
    if (this.device?.gatt) {
      try {
        this.device.gatt.disconnect()
      } catch {
        // Ignore errors during disconnect (e.g. already disconnected)
      }
    }

    this.device = null
    this.abortController = null
    this.isDisconnecting = false
  }

  // Watchdog for stale data
  private startWatchdog(): void {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval)
    if (this.options.dataLivenessTimeoutMs === 0) return

    this.watchdogInterval = setInterval(() => {
      if (
        performance.now() - this.lastDataTime >
        this.options.dataLivenessTimeoutMs
      ) {
        logger.warn(
          { device: this.device?.name },
          'Bluetooth data stale. Forcing reconnection...'
        )
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
    const disconnectedDevice = this.device
    if (!disconnectedDevice) return

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
        message: 'Manually Disconnected',
      })
    }
  }

  private onHeartRateChanged = (event: Event): void => {
    this.lastDataTime = performance.now()
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

  private handleConnectionError = (
    error: unknown,
    context?: 'requestDevice'
  ): void => {
    let message = 'An unknown connection error occurred.'
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') {
        if (context === 'requestDevice') {
          message = 'Connection cancelled. No device selected.'
        } else {
          message = 'Bluetooth service or characteristic not found.'
        }
      } else if (error.name === 'NetworkError') {
        message = 'Connection failed. Device is out of range.'
      } else {
        message = `Bluetooth error: ${error.name} - ${error.message}`
      }
    } else if (error instanceof Error) {
      message = error.message
    }
    this.emit('status-changed', { status: 'error', message })
    this.cleanup()
  }
}

export default DeviceManagerService
