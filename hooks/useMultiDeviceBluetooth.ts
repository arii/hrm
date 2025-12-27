/**
 * @file useMultiDeviceBluetooth.ts
 * @description This file exports a custom React hook for managing multiple Bluetooth HRM devices.
 */
import { useCallback, useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { HrmInputData } from '@/types/websocket';

type DeviceId = string;
export type DisconnectionReason = 'manual' | 'timeout' | 'signal_loss' | null

// Storing listener references for proper cleanup
type CharacteristicValueChangedListener = (event: any) => void;
type GattServerDisconnectedListener = () => void;

export interface ConnectedDevice {
  id: DeviceId;
  device: BluetoothDevice;
  status: string;
  batteryLevel?: number;
  hrValue?: number;
  reconnectAttempt: number;
  disconnectionReason: DisconnectionReason;
  characteristic?: BluetoothRemoteGATTCharacteristic;
  // Keep track of listeners for cleanup
  listeners?: {
    char: CharacteristicValueChangedListener;
    gatt: GattServerDisconnectedListener;
  }
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
  const reconnectTimeouts = useRef<Record<DeviceId, NodeJS.Timeout>>({}).current;
  const dataBuffer = useRef<HrmInputData[]>([]).current;
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  );

  const handleDisconnectRef = useRef<((deviceId: DeviceId, reason: DisconnectionReason) => void) | null>(null);

  useEffect(() => {
    if (connectionStatus === 'Connected' && dataBuffer.length > 0) {
      dataBuffer.forEach(data => sendData({ type: 'HRM_INPUT', data }));
      dataBuffer.length = 0;
    }
  }, [connectionStatus, dataBuffer, sendData]);

  const updateDeviceState = (deviceId: DeviceId, updates: Partial<ConnectedDevice>) => {
      setConnectedDevices(prev => ({
          ...prev,
          [deviceId]: { ...prev[deviceId], ...updates },
      }));
  };

  const connectToGatt = useCallback(async (device: BluetoothDevice) => {
    updateDeviceState(device.id, { status: `Connecting to: ${device.name || 'Device'}...` });

    try {
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');

      const onCharacteristicValueChanged: CharacteristicValueChangedListener = (event: any) => {
        const heartRate = parseHeartRate(event.target.value);
        const hrmInputData: HrmInputData = { value: heartRate, deviceId: device.id };

        if (connectionStatus === 'Connected') {
          sendData({ type: 'HRM_INPUT', data: hrmInputData });
        } else {
          dataBuffer.push(hrmInputData);
        }
        updateDeviceState(device.id, { hrValue: heartRate });
      };

      const onGattServerDisconnected: GattServerDisconnectedListener = () => {
        if (handleDisconnectRef.current) {
            handleDisconnectRef.current(device.id, 'signal_loss');
        }
      };

      characteristic.addEventListener('characteristicvaluechanged', onCharacteristicValueChanged);
      device.addEventListener('gattserverdisconnected', onGattServerDisconnected);

      try {
        const batteryService = await server.getPrimaryService('battery_service');
        const batteryChar = await batteryService.getCharacteristic('battery_level');
        const value = await batteryChar.readValue();
        updateDeviceState(device.id, { batteryLevel: value.getUint8(0) });
      } catch (error) {
        console.warn('Battery service not found for device:', device.name);
      }

      updateDeviceState(device.id, {
        status: `Connected to: ${device.name}`,
        reconnectAttempt: 0,
        disconnectionReason: null,
        characteristic,
        listeners: {
            char: onCharacteristicValueChanged,
            gatt: onGattServerDisconnected,
        }
      });

    } catch (error) {
      console.error('GATT Connection failed for device:', device.name, error);
      if (handleDisconnectRef.current) {
        handleDisconnectRef.current(device.id, 'timeout');
      }
    }
  }, [connectionStatus, dataBuffer, sendData]);

  const scheduleReconnect = useCallback((deviceId: DeviceId) => {
    const deviceState = connectedDevices[deviceId];
    if (!deviceState || deviceState.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        console.log(`Max reconnect attempts reached for ${deviceId}. Giving up.`);
        updateDeviceState(deviceId, { status: 'Failed to reconnect' });
        return;
    }

    const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, deviceState.reconnectAttempt);
    updateDeviceState(deviceId, { status: `Connection lost. Retrying in ${delay / 1000}s...` });

    reconnectTimeouts[deviceId] = setTimeout(() => {
        updateDeviceState(deviceId, { reconnectAttempt: deviceState.reconnectAttempt + 1 });
        connectToGatt(deviceState.device);
    }, delay);
  }, [connectedDevices, connectToGatt, reconnectTimeouts]);

  const removeDevice = useCallback((deviceId: string) => {
    const deviceState = connectedDevices[deviceId];
    if (!deviceState) return;

    if (deviceState.listeners) {
        deviceState.device.removeEventListener('gattserverdisconnected', deviceState.listeners.gatt);
        if(deviceState.characteristic) {
            deviceState.characteristic.removeEventListener('characteristicvaluechanged', deviceState.listeners.char);
        }
    }

    if (deviceState.device.gatt?.connected) {
      deviceState.device.gatt.disconnect();
    }

    if (reconnectTimeouts[deviceId]) {
        clearTimeout(reconnectTimeouts[deviceId]);
        delete reconnectTimeouts[deviceId];
    }

    setConnectedDevices(prev => {
      const newDevices = { ...prev };
      delete newDevices[deviceId];
      return newDevices;
    });
  }, [connectedDevices, reconnectTimeouts]);

  const handleDisconnect = useCallback((deviceId: DeviceId, reason: DisconnectionReason) => {
    const deviceState = connectedDevices[deviceId];
    if (!deviceState) return;

    updateDeviceState(deviceId, { disconnectionReason: reason });

    if (deviceState.device.gatt?.connected) {
        deviceState.device.gatt.disconnect();
    }

    if (reason !== 'manual') {
        scheduleReconnect(deviceId);
    } else {
        removeDevice(deviceId);
    }
  }, [connectedDevices, scheduleReconnect, removeDevice]);

  useEffect(() => {
    handleDisconnectRef.current = handleDisconnect;
  }, [handleDisconnect]);

  const connectNewDevice = useCallback(async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      });

      if (device) {
        updateDeviceState(device.id, {
            id: device.id,
            device,
            status: 'Initializing...',
            reconnectAttempt: 0,
            disconnectionReason: null,
        });
        connectToGatt(device);
      }
    } catch (error) {
      console.error('Error connecting to new device:', error);
    }
  }, [connectToGatt]);

  const disconnectDevice = useCallback((deviceId: DeviceId) => {
    handleDisconnect(deviceId, 'manual');
  }, [handleDisconnect]);

  const forgetDevice = useCallback(async (deviceId: DeviceId) => {
    const deviceToForget = connectedDevices[deviceId];
    disconnectDevice(deviceId);
    if (deviceToForget && (deviceToForget.device as any).forget) {
        await (deviceToForget.device as any).forget();
    }
  }, [connectedDevices, disconnectDevice]);

  useEffect(() => {
      return () => {
          Object.keys(connectedDevices).forEach(deviceId => {
              disconnectDevice(deviceId);
          });
      };
  }, [connectedDevices, disconnectDevice]);

  return {
    connectedDevices,
    connectNewDevice,
    disconnectDevice,
    forgetDevice,
    isSupported,
  };
};

export default useMultiDeviceBluetooth;
