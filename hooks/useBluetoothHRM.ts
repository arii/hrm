// hooks/useBluetoothHRM.ts
import { useCallback, useEffect, useRef } from 'react';
import { useBluetoothConnection } from './useBluetoothHRM/useBluetoothConnection';
import { useHRMDataSubscription } from './useBluetoothHRM/useHRMDataSubscription';
import { useBluetoothWatchdog } from './useBluetoothHRM/useBluetoothWatchdog';
import { useWebSocket } from '@/context/WebSocketContext';
import { calculateMaxHr } from '../utils/constants';
import isEqual from 'lodash.isequal';
import { HrmMetadataUpdateMessage, HrmMetadataUpdateData } from '../types/websocket';
import { BluetoothConnectionStatus } from '../types/bluetooth';

interface UseBluetoothHRMProps {
  dataLivenessTimeoutMs?: number;
  userName?: string | null;
  userAge?: number | null;
  onHeartRateUpdate?: (heartRate: number) => void;
  onConnect?: () => void;
}

export const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const {
    dataLivenessTimeoutMs = 10000,
    userName,
    userAge,
    onHeartRateUpdate,
    onConnect,
  } = props;

  const { sendData, connectionStatus } = useWebSocket();
  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 });
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null);

  const {
    batteryLevel,
    signalPeriodMs,
    lastDataTime,
    avgPeriodMs,
    handleGattServerConnected,
    updateSignalPeriod,
    reset: resetDataSubscription,
  } = useHRMDataSubscription({ onHeartRateUpdate });

  const {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    isConnected,
    isSupported,
    deviceRef,
  } = useBluetoothConnection(handleGattServerConnected);

  const statusRef = useRef(deviceStatus);

  const { isDataStale } = useBluetoothWatchdog({
    dataLivenessTimeoutMs,
    statusRef,
    lastDataTime,
    avgPeriodMs,
    deviceRef,
    updateSignalPeriod,
    onDisconnect: disconnect,
  });

  useEffect(() => {
    userDetailsRef.current = { name: userName || '', age: userAge || 0 };
  }, [userName, userAge]);

  useEffect(() => {
    if (isConnected) {
      const { name, age } = userDetailsRef.current;
      const calculatedMaxHr = calculateMaxHr(age);
      const deviceName = deviceRef.current?.name || 'Unknown';

      const metadataData: HrmMetadataUpdateData = {
        maxHr: calculatedMaxHr,
        name: name || `Bluetooth HRM (${deviceName})`,
      };
      if (typeof age === 'number') {
        metadataData.age = age;
      }

      if (!isEqual(lastSentMetadataRef.current, metadataData)) {
        const metadata: HrmMetadataUpdateMessage = {
          type: 'HRM_METADATA_UPDATE',
          data: metadataData,
        };
        sendData(metadata);
        lastSentMetadataRef.current = metadataData;
      }
    }
  }, [userName, userAge, isConnected, sendData, deviceRef]);

  const handleDisconnect = useCallback(() => {
    sendData({ type: 'HRM_INPUT', data: { value: null } });
    resetDataSubscription();
    disconnect();
  }, [sendData, resetDataSubscription, disconnect]);

  useEffect(() => {
    if (onConnect && isConnected) {
      onConnect();
    }
  }, [isConnected, onConnect]);

  return {
    connectAndStream,
    autoConnect,
    disconnect: handleDisconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isDataStale,
    isSupported,
    signalPeriodMs,
  };
};

export default useBluetoothHRM;
