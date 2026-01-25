/**
 * @file useBluetoothConnection.ts
 * @description A generic React hook for managing the lifecycle of a Bluetooth Low Energy (BLE) device connection.
 * It handles device discovery, connection, disconnection, and automatic reconnection.
 */
import { useCallback, useState, useRef, useEffect } from 'react';
import { BluetoothConnectionStatus } from '../types/bluetooth';
import logger from '@/utils/logger';
import { cancellablePromise } from '@/utils/promise';
import { getCookie, setCookie } from '@/utils/cookies';

const statusMessageMap: Record<BluetoothConnectionStatus, string> = {
  [BluetoothConnectionStatus.DISCONNECTED]: 'Disconnected',
  [BluetoothConnectionStatus.CONNECTING]: 'Connecting...',
  [BluetoothConnectionStatus.CONNECTED]: 'Connected',
  [BluetoothConnectionStatus.RECONNECTING]: 'Reconnecting...',
  [BluetoothConnectionStatus.ERROR]: 'Error',
};

const MAX_RECONNECT_ATTEMPTS = 5;
const DEVICE_ID_COOKIE_NAME = 'hrm_device_id';

interface UseBluetoothConnectionProps {
  serviceUuids: string[];
  optionalServiceUuids?: string[];
  onConnect?: (device: BluetoothDevice) => void;
  onDisconnect?: () => void;
}

export const useBluetoothConnection = (props: UseBluetoothConnectionProps) => {
  const { serviceUuids, optionalServiceUuids = [], onConnect, onDisconnect } = props;

  const [status, setStatus] = useState<BluetoothConnectionStatus>(
    BluetoothConnectionStatus.DISCONNECTED
  );
  const [customStatusMessage, setCustomStatusMessage] = useState<string | null>(
    null
  );
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  );

  const deviceStatus = customStatusMessage ?? statusMessageMap[status];

  const statusRef = useRef(status);
  const isManualDisconnect = useRef(false);
  const isTimeoutDisconnect = useRef(false); // This can be controlled externally if needed
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnecting = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const connectToGattRef = useRef<((device: BluetoothDevice) => Promise<boolean>) | null>(null);
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)

  useEffect(() => {
    onConnectRef.current = onConnect
  },[onConnect])

  useEffect(() => {
    onDisconnectRef.current = onDisconnect
  },[onDisconnect])

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    isManualDisconnect.current = false;
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true;
    isTimeoutDisconnect.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (device?.gatt?.connected) device.gatt.disconnect();

    setStatus(BluetoothConnectionStatus.DISCONNECTED);
    setCustomStatusMessage(null);
    setDevice(null);
    onDisconnectRef.current?.();
  }, [device]);

  const forgetDevice = useCallback(async () => {
    logger.info('Initiating device forget sequence...');
    disconnect();
    try {
      setCookie(DEVICE_ID_COOKIE_NAME, '', -1);
      setStatus(BluetoothConnectionStatus.DISCONNECTED);
      setCustomStatusMessage('Device permissions revoked. Ready for new connection.');
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget');
      setStatus(BluetoothConnectionStatus.ERROR);
      setCustomStatusMessage('Error clearing device permissions.');
    }
  }, [disconnect]);

  const handleConnectionError = useCallback((error: unknown) => {
    let msg = 'An unknown error occurred.';
    if (error instanceof DOMException) {
        if (error.name === 'NotFoundError') msg = 'Connection cancelled. No device selected.';
        else if (error.name === 'SecurityError') msg = 'Security error. Use HTTPS or localhost.';
        else if (error.name === 'NetworkError') msg = 'Connection failed. Device might be too far or low battery.';
        else msg = `Bluetooth error: ${error.name}`;
    } else if (error instanceof Error) {
        if (error.message.includes('timeout')) msg = 'Connection timed out. Wake up device and try again.';
        else msg = `Error: ${error.message}`;
    }
    setStatus(BluetoothConnectionStatus.ERROR);
    setCustomStatusMessage(`Failed: ${msg}`);
    logger.error({ error }, msg);
  }, []);

  const onGattServerDisconnected = useCallback(() => {
    onDisconnectRef.current?.();

    if (!isManualDisconnect.current && device && !isConnecting.current) {
      reconnectAttempts.current += 1;
      const attemptNum = reconnectAttempts.current;

      logger.info({ device: device.name, attempt: attemptNum, maxAttempts: MAX_RECONNECT_ATTEMPTS }, 'Device disconnected, attempting auto-reconnect...');

      if (attemptNum <= MAX_RECONNECT_ATTEMPTS) {
        const reasonText = isTimeoutDisconnect.current ? 'Timeout' : 'Signal Lost';
        setStatus(BluetoothConnectionStatus.RECONNECTING);
        setCustomStatusMessage(`${reasonText}. Reconnecting... (Attempt ${attemptNum}/${MAX_RECONNECT_ATTEMPTS})`);

        const baseDelay = 1000 + (attemptNum - 1) * 500;
        const randomDelay = baseDelay + Math.random() * 1000;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (connectToGattRef.current) {
            connectToGattRef.current(device).catch((error) => {
              if (error.name !== 'AbortError') {
                logger.error({ error, device: device.name, attempt: attemptNum }, 'Auto-reconnect attempt failed');
              }
            });
          }
        }, randomDelay);
      } else {
        logger.error({ device: device.name, maxAttempts: MAX_RECONNECT_ATTEMPTS }, 'Max reconnection attempts reached. Resetting device.');
        setStatus(BluetoothConnectionStatus.ERROR);
        setCustomStatusMessage(`Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts. Resetting device...`);

        reconnectTimeoutRef.current = setTimeout(async () => {
          await forgetDevice();
          reconnectAttempts.current = 0;
        }, 2000);
      }
    } else {
      logger.info('Device disconnected manually.');
      setStatus(BluetoothConnectionStatus.DISCONNECTED);
      setCustomStatusMessage(null);
      reconnectAttempts.current = 0;
    }
  }, [device, forgetDevice]);

  const connectToGatt = useCallback(async (targetDevice: BluetoothDevice) => {
    if (isConnecting.current) {
      logger.warn({ device: targetDevice.name }, 'Aborting previous pending connection attempt');
      abortControllerRef.current?.abort();
    }
    try {
      isConnecting.current = true;
      setDevice(targetDevice);
      setStatus(BluetoothConnectionStatus.CONNECTING);
      setCustomStatusMessage(`Connecting to: ${targetDevice.name || 'Device'}...`);

      abortControllerRef.current = new AbortController();

      let server: BluetoothRemoteGATTServer | undefined;
      let attempt = 0;
      const maxRetries = 3;

      while (true) {
        try {
          server = await cancellablePromise(targetDevice.gatt!.connect(), {
            timeoutMs: 30000,
            errorMessage: 'GATT connection timeout',
            signal: abortControllerRef.current.signal,
          });
          break;
        } catch (error) {
          const err = error as DOMException | Error;
          const isZombieError = ('name' in err && err.name === 'NetworkError') || err.message.includes('range') || err.message.includes('busy');

          if (isZombieError && attempt < maxRetries && !abortControllerRef.current.signal.aborted) {
            attempt++;
            const delayMs = Math.pow(2, attempt) * 1000;
            logger.warn({ device: targetDevice.name, attempt, delayMs }, 'Device likely busy (Zombie connection). Retrying...');
            setCustomStatusMessage(`Device busy. Retrying in ${delayMs / 1000}s... (${attempt}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          } else {
            throw error;
          }
        }
      }

      if (abortControllerRef.current?.signal.aborted) {
        server?.disconnect();
        throw new DOMException('Connection aborted', 'AbortError');
      }

      targetDevice.addEventListener('gattserverdisconnected', onGattServerDisconnected);

      setStatus(BluetoothConnectionStatus.CONNECTED);
      setCustomStatusMessage(`Connected to: ${targetDevice.name}`);
      setCookie(DEVICE_ID_COOKIE_NAME, targetDevice.id);
      isManualDisconnect.current = false;
      isTimeoutDisconnect.current = false;
      reconnectAttempts.current = 0;
      onConnectRef.current?.(targetDevice);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isIntentionalAbort = error instanceof DOMException && error.name === 'AbortError' && abortControllerRef.current?.signal.aborted;

      if (!isIntentionalAbort) {
        logger.error({ error, device: targetDevice.name }, 'GATT Connection failed');
        if (errorMsg.includes('timeout')) {
            setStatus(BluetoothConnectionStatus.ERROR);
            setCustomStatusMessage('Connection timeout. Resetting device...');
            await forgetDevice();
        } else {
            setDevice(null);
        }
      }
      throw error;
    } finally {
      isConnecting.current = false;
    }
  }, [onGattServerDisconnected, forgetDevice]);

  useEffect(() => {
    connectToGattRef.current = connectToGatt;
  }, [connectToGatt]);

  const connect = useCallback(async (options: { silent?: boolean } = {}): Promise<void> => {
    const { silent = false } = options;

    if (statusRef.current === BluetoothConnectionStatus.CONNECTED) return;

    try {
      setStatus(BluetoothConnectionStatus.CONNECTING);
      setCustomStatusMessage('Checking saved devices...');
      let targetDevice = device;

      if (!targetDevice) {
        const savedDeviceId = getCookie(DEVICE_ID_COOKIE_NAME);
        if (savedDeviceId && navigator.bluetooth?.getDevices) {
          const devices = await navigator.bluetooth.getDevices();
          const foundDevice = devices.find((d) => d.id === savedDeviceId);
          if (foundDevice) {
            await connectToGatt(foundDevice);
            return;
          }
        }
      }

      if (!targetDevice && !silent) {
        setCustomStatusMessage('Scanning for devices...');
        targetDevice = await navigator.bluetooth.requestDevice({
          filters: [{ services: serviceUuids }],
          optionalServices: optionalServiceUuids,
        });
      }

      if (targetDevice) {
        await connectToGatt(targetDevice);
      } else if (!silent) {
        setStatus(BluetoothConnectionStatus.DISCONNECTED);
        setCustomStatusMessage(null);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        if (!silent) handleConnectionError(error);
        else logger.info({ error }, 'Silent auto-connect failed.');
      }
      setStatus(BluetoothConnectionStatus.DISCONNECTED);
      setCustomStatusMessage(null);
      if (!silent) throw error;
    }
  }, [device, connectToGatt, handleConnectionError, serviceUuids, optionalServiceUuids]);

  const autoConnect = useCallback(async (): Promise<void> => {
    try {
        logger.info('Starting auto-connect to saved device...');
        setStatus(BluetoothConnectionStatus.CONNECTING);
        setCustomStatusMessage('Connecting to saved device...');
        await connect({ silent: true });
        logger.info('Auto-connect succeeded');
      } catch (error) {
        logger.info({error}, 'Auto-connect failed, user can connect manually');
        setStatus(BluetoothConnectionStatus.DISCONNECTED);
        setCustomStatusMessage('Auto-connect failed. Use Connect button to select device.');
      }
  }, [connect]);


  return {
    connect,
    autoConnect,
    disconnect,
    forgetDevice,
    device,
    deviceStatus,
    status,
    isConnected: status === BluetoothConnectionStatus.CONNECTED,
    isSupported,
  };
};
