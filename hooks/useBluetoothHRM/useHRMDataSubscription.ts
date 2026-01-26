// hooks/useBluetoothHRM/useHRMDataSubscription.ts
import { useCallback, useState, useRef, useEffect } from 'react';
import logger from '@/utils/logger';

const HR_SERVICE_UUID = 'heart_rate';
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement';
const BATTERY_SERVICE_UUID = 'battery_service';
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level';

const ROLLING_AVG_HISTORY_LENGTH = 5;

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0);
  const is16Bit = flags & 0x1;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
};

interface UseHRMDataSubscriptionProps {
  onHeartRateUpdate?: (heartRate: number) => void;
}

export const useHRMDataSubscription = ({ onHeartRateUpdate }: UseHRMDataSubscriptionProps) => {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [signalPeriodMs, setSignalPeriodMs] = useState<number>(0);

  const lastDataTime = useRef<number>(0);
  const periodHistory = useRef<number[]>([]);
  const avgPeriodMs = useRef<number>(0);

  const onHeartRateUpdateRef = useRef(onHeartRateUpdate);

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate;
  }, [onHeartRateUpdate]);

  const updateSignalPeriod = useCallback((newPeriod: number) => {
    periodHistory.current.push(newPeriod);
    if (periodHistory.current.length > ROLLING_AVG_HISTORY_LENGTH) {
      periodHistory.current.shift();
    }
    const total = periodHistory.current.reduce((sum, val) => sum + val, 0);
    const average = total / periodHistory.current.length;
    avgPeriodMs.current = average;
    setSignalPeriodMs(Math.round(average));
  }, []);

  const handleGattServerConnected = useCallback(
    async (server: BluetoothRemoteGATTServer) => {
      const service = await server.getPrimaryService(HR_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(
        HR_CHARACTERISTIC_UUID
      );

      try {
        const batteryService = await server.getPrimaryService(BATTERY_SERVICE_UUID);
        const batteryChar = await batteryService.getCharacteristic(
          BATTERY_LEVEL_CHARACTERISTIC_UUID
        );
        const value = await batteryChar.readValue();
        setBatteryLevel(value.getUint8(0));
        await batteryChar.startNotifications();
        batteryChar.addEventListener(
          'characteristicvaluechanged',
          (e: unknown) => {
            const event = e as Event;
            const target = event.target as BluetoothRemoteGATTCharacteristic;
            setBatteryLevel(target.value!.getUint8(0));
          }
        );
      } catch (_err) {
        /* Battery service optional */
        logger.info('Battery service not found, skipping.');
      }

      await characteristic.startNotifications();
      lastDataTime.current = Date.now();

      characteristic.addEventListener(
        'characteristicvaluechanged',
        (event: unknown) => {
          const now = Date.now();

          if (lastDataTime.current > 0) {
            const delta = now - lastDataTime.current;
            updateSignalPeriod(delta);
          }

          const e = event as Event;
          const target = e.target as BluetoothRemoteGATTCharacteristic;
          const heartRate = parseHeartRate(target.value!);
          lastDataTime.current = now;
          logger.debug({ heartRate }, 'Heart rate data received from Bluetooth');
          onHeartRateUpdateRef.current?.(heartRate);
        }
      );
    },
    [updateSignalPeriod]
  );

  const reset = useCallback(() => {
    setBatteryLevel(null);
    setSignalPeriodMs(0);
    lastDataTime.current = 0;
    periodHistory.current = [];
    avgPeriodMs.current = 0;
  }, []);

  return {
    batteryLevel,
    signalPeriodMs,
    lastDataTime,
    avgPeriodMs,
    handleGattServerConnected,
    updateSignalPeriod,
    reset,
  };
};
