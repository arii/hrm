/**
 * @file useMultiDeviceBluetooth.ts
 * @description This file exports a custom React hook for managing multiple Bluetooth HRM devices.
 */
import { useCallback, useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { HrmInputData } from '@/types/websocket';

type DeviceId = string;
export type DisconnectionReason = 'manual' | 'timeout' | 'signal_loss' | null

export interface ConnectedDevice {
  id: DeviceId;
  device: BluetoothDevice;
  status: string;
  batteryLevel?: number;
  hrValue?: number;
  reconnectAttempt: number;
  disconnectionReason: DisconnectionReason;
  rssi?: number;
}

export interface DiscoveredDevice {
    device: BluetoothDevice;
    rssi?: number;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0);
  const is16Bit = flags & 0x1;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
};

const useMultiDeviceBluetooth = () => {
  const { sendData, connectionStatus } = useWebSocket();
  const [connectedDevices, setConnectedDevices] = useState<Record<DeviceId, ConnectedDevice>>({});
  const [discoveredDevices, setDiscoveredDevices] = useState<Record<DeviceId, DiscoveredDevice>>({});
  const [isScanning, setIsScanning] = useState(false);
  const reconnectTimeouts = useRef<Record<DeviceId, NodeJS.Timeout>>({}).current;
  const dataBuffer = useRef<HrmInputData[]>([]).current;
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  );
  const scanRef = useRef<BluetoothLEScan | null>(null);

  useEffect(() => {
    if (connectionStatus === 'Connected' && dataBuffer.length > 0) {
      dataBuffer.forEach(data => sendData({ type: 'HRM_INPUT', data }));
      dataBuffer.length = 0;
    }
  }, [connectionStatus, dataBuffer, sendData]);

  const updateDeviceStatus = (deviceId: DeviceId, status: string, disconnectionReason: DisconnectionReason = null) => {
    setConnectedDevices(prev => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], status, disconnectionReason },
    }));
  };

  const handleDisconnect = useCallback((deviceId: DeviceId, reason: DisconnectionReason) => {
    if (reconnectTimeouts[deviceId]) {
        clearTimeout(reconnectTimeouts[deviceId]);
        delete reconnectTimeouts[deviceId];
    }

    const device = connectedDevices[deviceId];
    if (device) {
        if (device.device.gatt?.connected) {
            device.device.gatt.disconnect();
        }
        setConnectedDevices(prev => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], disconnectionReason: reason },
        }));
        if (reason !== 'manual') {
            scheduleReconnect(deviceId);
        }
    }
  }, [connectedDevices, reconnectTimeouts, scheduleReconnect]);

  const connectToGatt = useCallback(async (device: BluetoothDevice, rssi?: number) => {
    updateDeviceStatus(device.id, `Connecting to: ${device.name || 'Device'}...`);
    setConnectedDevices(prev => ({
        ...prev,
        [device.id]: {
          id: device.id,
          device,
          status: 'Initializing...',
          reconnectAttempt: 0,
          disconnectionReason: null,
          rssi,
        },
    }));

    try {
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');

      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const heartRate = parseHeartRate(event.target.value);
        const hrmInputData: HrmInputData = { value: heartRate, deviceId: device.id };

        if (connectionStatus === 'Connected') {
          sendData({ type: 'HRM_INPUT', data: hrmInputData });
        } else {
          dataBuffer.push(hrmInputData);
        }

        setConnectedDevices(prev => ({
          ...prev,
          [device.id]: { ...prev[device.id], hrValue: heartRate },
        }));
      });
      await characteristic.startNotifications();

      try {
        const batteryService = await server.getPrimaryService('battery_service');
        const batteryChar = await batteryService.getCharacteristic('battery_level');
        const value = await batteryChar.readValue();
        setConnectedDevices(prev => ({
          ...prev,
          [device.id]: { ...prev[device.id], batteryLevel: value.getUint8(0) },
        }));
      } catch (error) {
        console.warn('Battery service not found for device:', device.name);
      }

      device.addEventListener('gattserverdisconnected', () => handleDisconnect(device.id, 'signal_loss'));

      setConnectedDevices(prev => ({
        ...prev,
        [device.id]: {
            ...prev[device.id],
            status: `Connected to: ${device.name}`,
            reconnectAttempt: 0,
            disconnectionReason: null,
        },
      }));

    } catch (error) {
      console.error('GATT Connection failed for device:', device.name, error);
      handleDisconnect(device.id, 'timeout');
    }
  }, [connectionStatus, dataBuffer, sendData, handleDisconnect]);

  const scheduleReconnect = useCallback((deviceId: DeviceId) => {
    const device = connectedDevices[deviceId];
    if (!device || device.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        console.log(`Max reconnect attempts reached for ${deviceId}. Giving up.`);
        return;
    }

    const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, device.reconnectAttempt);
    updateDeviceStatus(deviceId, `Connection lost. Retrying in ${delay / 1000}s...`, device.disconnectionReason);

    reconnectTimeouts[deviceId] = setTimeout(() => {
        setConnectedDevices(prev => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], reconnectAttempt: prev[deviceId].reconnectAttempt + 1 },
        }));
        connectToGatt(device.device, device.rssi);
    }, delay);

  }, [connectedDevices, connectToGatt, reconnectTimeouts]);

  const stopScan = useCallback(() => {
    if (scanRef.current) {
        scanRef.current.stop();
        scanRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const selectDeviceToConnect = useCallback((device: BluetoothDevice, rssi?: number) => {
    stopScan();
    setDiscoveredDevices({});
    connectToGatt(device, rssi);
  }, [stopScan, connectToGatt]);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setDiscoveredDevices({});
    try {
        const scan = await navigator.bluetooth.requestLEScan({
            filters: [{ services: ['heart_rate'] }],
        });
        scanRef.current = scan;
        navigator.bluetooth.addEventListener('advertisementreceived', (event: any) => {
            setDiscoveredDevices(prev => ({
                ...prev,
                [event.device.id]: { device: event.device, rssi: event.rssi },
            }));
        });
    } catch (error) {
        console.error('Error starting BLE scan:', error);
        setIsScanning(false);
    }
  }, []);

  const disconnectDevice = useCallback((deviceId: DeviceId) => {
    handleDisconnect(deviceId, 'manual');
    setConnectedDevices(prev => {
      const newDevices = { ...prev };
      delete newDevices[deviceId];
      return newDevices;
    });
  }, [handleDisconnect]);

  const forgetDevice = useCallback(async (deviceId: DeviceId) => {
    const deviceToForget = connectedDevices[deviceId];
    disconnectDevice(deviceId);
    if (deviceToForget && deviceToForget.device.forget) {
        await deviceToForget.device.forget();
    }
  }, [connectedDevices, disconnectDevice]);

  return {
    connectedDevices,
    discoveredDevices,
    isScanning,
    startScan,
    stopScan,
    selectDeviceToConnect,
    disconnectDevice,
    forgetDevice,
    isSupported,
  };
};

export default useMultiDeviceBluetooth;
