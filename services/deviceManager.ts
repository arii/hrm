/**
 * @file deviceManager.ts
 * @description This file exports a DeviceManager class that encapsulates all
 * Bluetooth API interactions for the HRM Dashboard project. It uses an
 * event-emitter pattern to broadcast device events.
 */
import { cancellablePromise } from '@/utils/promise';
import logger from '@/utils/logger';

const HR_SERVICE_UUID = 'heart_rate';
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement';
const BATTERY_SERVICE_UUID = 'battery_service';
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level';

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0);
  const is16Bit = flags & 0x1;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
};

export type DeviceStatus =
  | 'Disconnected'
  | 'Scanning'
  | 'Connecting'
  | 'Connected'
  | 'Error';

export type DisconnectionReason = 'manual' | 'timeout' | 'signal_loss';

type DeviceManagerEvent = 'statusChange' | 'heartRate' | 'batteryLevel' | 'disconnected';

type EventCallback = (data: any) => void;

class DeviceManager {
  private device: BluetoothDevice | null = null;
  private abortController: AbortController | null = null;
  private isManualDisconnect = false;
  private listeners: Map<DeviceManagerEvent, Set<EventCallback>> = new Map();

  public on(event: DeviceManagerEvent, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  public off(event: DeviceManagerEvent, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: DeviceManagerEvent, data: any): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  private setStatus(status: string): void {
    this.emit('statusChange', status);
  }

  private async connectToGatt(device: BluetoothDevice): Promise<void> {
    try {
      this.device = device;
      this.setStatus(`Connecting to: ${device.name || 'Device'}...`);

      this.abortController = new AbortController();
      const server = await cancellablePromise(device.gatt!.connect(), {
        timeoutMs: 10000,
        errorMessage: 'GATT connection timeout',
        signal: this.abortController.signal,
      });

      const service = await server.getPrimaryService(HR_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(HR_CHARACTERISTIC_UUID);

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', this.handleHeartRate);

      try {
        const batteryService = await server.getPrimaryService(BATTERY_SERVICE_UUID);
        const batteryChar = await batteryService.getCharacteristic(BATTERY_LEVEL_CHARACTERISTIC_UUID);
        const value = await batteryChar.readValue();
        this.emit('batteryLevel', value.getUint8(0));
        await batteryChar.startNotifications();
        batteryChar.addEventListener('characteristicvaluechanged', this.handleBatteryLevel);
      } catch (_err) {
        // Battery service is optional
      }

      device.addEventListener('gattserverdisconnected', this.onDisconnected);

      this.setStatus(`Connected to: ${device.name}`);
      this.isManualDisconnect = false;
    } catch (error) {
      logger.error({ error, device: device.name }, 'GATT Connection failed');
      this.setStatus('Error');
      throw error;
    }
  }

  private handleHeartRate = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const heartRate = parseHeartRate(target.value!);
    this.emit('heartRate', heartRate);
  };

  private handleBatteryLevel = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const batteryLevel = target.value!.getUint8(0);
    this.emit('batteryLevel', batteryLevel);
  };

  private onDisconnected = () => {
    this.emit('batteryLevel', null);
    if (!this.isManualDisconnect) {
      this.setStatus('Signal Lost. Retrying...');
      this.emit('disconnected', 'signal_loss');
      setTimeout(() => {
        if (this.device) this.connectToGatt(this.device);
      }, 2000);
    }
  };

  async connectAndStream(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }

    try {
      this.setStatus('Scanning for devices...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE_UUID] }],
        optionalServices: [BATTERY_SERVICE_UUID],
      });
      if (device) {
        await this.connectToGatt(device);
      }
    } catch (error) {
      this.handleConnectionError(error);
      throw error;
    }
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.setStatus('Disconnected');
    this.emit('disconnected', 'manual');
    this.device = null;
  }

  async forgetDevice(): Promise<void> {
    this.disconnect();
    try {
      if (navigator.bluetooth && navigator.bluetooth.getDevices) {
        const devices = await navigator.bluetooth.getDevices();
        for (const device of devices) {
          if (device.forget) await device.forget();
        }
      }
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget');
    }
  }

  private handleConnectionError(error: unknown) {
    let msg = 'An unknown error occurred.';
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') {
        msg = 'Connection cancelled. No device selected.';
      } else {
        msg = `Bluetooth error: ${error.name}`;
      }
    } else if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        msg = 'Connection timed out.';
      } else {
        msg = `Error: ${error.message}`;
      }
    }
    this.setStatus(`Failed: ${msg}`);
  }
}

// Export a singleton instance
const deviceManager = new DeviceManager();
export default deviceManager;
