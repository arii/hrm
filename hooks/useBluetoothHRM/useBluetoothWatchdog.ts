// hooks/useBluetoothHRM/useBluetoothWatchdog.ts
import { useState, useEffect, MutableRefObject } from 'react';
import { BluetoothConnectionStatus } from '../../types/bluetooth';

const MISSED_PACKET_THRESHOLD_BUFFER_MS = 500;
const MIN_MISSED_PACKET_THRESHOLD_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 1000;

interface UseBluetoothWatchdogProps {
  dataLivenessTimeoutMs: number;
  statusRef: MutableRefObject<BluetoothConnectionStatus>;
  lastDataTime: MutableRefObject<number>;
  avgPeriodMs: MutableRefObject<number>;
  deviceRef: MutableRefObject<BluetoothDevice | null>;
  updateSignalPeriod: (newPeriod: number) => void;
  onDisconnect: () => void;
}

export const useBluetoothWatchdog = ({
  dataLivenessTimeoutMs,
  statusRef,
  lastDataTime,
  avgPeriodMs,
  deviceRef,
  updateSignalPeriod,
  onDisconnect,
}: UseBluetoothWatchdogProps) => {
  const [isDataStale, setIsDataStale] = useState(false);

  useEffect(() => {
    if (!dataLivenessTimeoutMs) return;

    const interval = setInterval(() => {
      if (
        statusRef.current === BluetoothConnectionStatus.CONNECTED &&
        lastDataTime.current > 0
      ) {
        const timeSinceLastData = Date.now() - lastDataTime.current;

        if (timeSinceLastData > dataLivenessTimeoutMs && !isDataStale) {
          setIsDataStale(true);
          onDisconnect();
        } else if (timeSinceLastData <= dataLivenessTimeoutMs && isDataStale) {
          setIsDataStale(false);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [dataLivenessTimeoutMs, isDataStale, onDisconnect, statusRef, lastDataTime]);

  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (
        statusRef.current !== BluetoothConnectionStatus.CONNECTED ||
        isDataStale ||
        lastDataTime.current === 0
      ) {
        return;
      }

      const now = Date.now();
      const timeSinceLastData = now - lastDataTime.current;

      const threshold = Math.max(
        avgPeriodMs.current + MISSED_PACKET_THRESHOLD_BUFFER_MS,
        MIN_MISSED_PACKET_THRESHOLD_MS
      );

      if (timeSinceLastData > threshold) {
        updateSignalPeriod(timeSinceLastData);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(heartbeat);
  }, [isDataStale, statusRef, lastDataTime, avgPeriodMs, updateSignalPeriod]);

  return { isDataStale };
};
