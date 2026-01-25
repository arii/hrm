/**
 * @file useGattSubscription.ts
 * @description A React hook for subscribing to notifications from a Bluetooth Low Energy (BLE) GATT characteristic.
 * It manages the subscription lifecycle and provides the latest value received from the device.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import logger from '@/utils/logger';

interface UseGattSubscriptionProps {
  device: BluetoothDevice | null;
  serviceUuid: string;
  characteristicUuid: string;
  onValueChange?: (value: DataView) => void;
  // If true, the hook will attempt to read the characteristic's value upon connection.
  readValueOnConnect?: boolean;
}

export const useGattSubscription = (props: UseGattSubscriptionProps) => {
  const { device, serviceUuid, characteristicUuid, onValueChange, readValueOnConnect = false } = props;
  const [value, setValue] = useState<DataView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onValueChangeRef = useRef(onValueChange);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  const handleValueChanged = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      setValue(target.value);
      onValueChangeRef.current?.(target.value);
    }
  }, []);

  useEffect(() => {
    if (!device || !device.gatt?.connected) {
      return;
    }

    let characteristic: BluetoothRemoteGATTCharacteristic;
    const subscribe = async () => {
      try {
        setError(null);
        const server = device.gatt;
        const service = await server!.getPrimaryService(serviceUuid);
        characteristic = await service.getCharacteristic(characteristicUuid);

        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleValueChanged);

        if (readValueOnConnect) {
            const initialValue = await characteristic.readValue();
            setValue(initialValue);
            onValueChangeRef.current?.(initialValue);
        }

        logger.info({ serviceUuid, characteristicUuid }, 'Successfully subscribed to GATT characteristic');
      } catch (e) {
        const err = e as Error;
        logger.error({ error: err, serviceUuid, characteristicUuid }, 'Failed to subscribe to GATT characteristic');
        setError(`Failed to subscribe: ${err.message}`);
      }
    };

    subscribe();

    return () => {
      if (characteristic) {
        characteristic.removeEventListener('characteristicvaluechanged', handleValueChanged);
        characteristic.stopNotifications().catch(e => {
            // This can fail if the device is already disconnected. Log and ignore.
            logger.warn({ error: e, characteristicUuid}, 'Failed to stop notifications cleanly');
        });
      }
    };
  }, [device, serviceUuid, characteristicUuid, handleValueChanged, readValueOnConnect]);

  return { value, error };
};
