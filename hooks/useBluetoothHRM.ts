// File: hooks/useBluetoothHRM.ts (Web Bluetooth HRM Hook - Typed)
/**
 * Hook to manage Web Bluetooth connection to a Heart Rate Monitor (HRM) device.
 * It streams data using the provided sendData function (from useWebSocket).
 */
import { useCallback, useState } from "react";
import { HrmInputMessage } from "../types/websocket";
import { MAX_HR_DEFAULT } from "../utils/constants";
import useWebSocket from "./useWebSocket";

// Heart Rate Service UUIDs (Standard Bluetooth Low Energy)
const HR_SERVICE_UUID = "heart_rate";
const HR_CHARACTERISTIC_UUID = "heart_rate_measurement";

/**
 * Parses the raw DataView received from the HR Measurement characteristic.
 */
const parseHeartRate = (value: DataView): number => {
  // Byte 0 is flags. Bit 0 indicates if the HR measurement is in 8 or 16 bits.
  const flags = value.getUint8(0);
  const is16Bit = flags & 0x1;
  let heartRate = 0;

  if (is16Bit) {
    // Heart rate is in 16-bit format (bytes 1 and 2)
    heartRate = value.getUint16(1, true);
  } else {
    // Heart rate is in 8-bit format (byte 1)
    heartRate = value.getUint8(1);
  }
  return heartRate;
};

const useBluetoothHRM = () => {
  // We assume the useWebSocket hook is available and provides the sendData function
  const { sendData, connectionStatus } = useWebSocket();
  const [deviceStatus, setDeviceStatus] = useState("Disconnected");

  const connectAndStream = useCallback(async () => {
    if (
      deviceStatus.startsWith("Connected") ||
      connectionStatus !== "Connected"
    )
      return;

    try {
      setDeviceStatus("Connecting");

      // 1. Request the device with the Heart Rate Service filter
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE_UUID] }],
      });
      setDeviceStatus(`Connected to: ${device.name}`);

      // 2. Connect to GATT server
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(HR_SERVICE_UUID);

      // 3. Get the Heart Rate Measurement characteristic
      const characteristic = await service.getCharacteristic(
        HR_CHARACTERISTIC_UUID
      );

      // 4. Start notifications to receive real-time data
      await characteristic.startNotifications();

      characteristic.addEventListener("characteristicvaluechanged", (event) => {
        const target =
          event.target as unknown as BluetoothRemoteGATTCharacteristic;
        const heartRate = parseHeartRate(target.value!);

        // --- 5. STREAM TYPED DATA TO SERVER VIA WEBSOCKET ---
        const message: HrmInputMessage = {
          type: "HRM_INPUT",
          data: {
            value: heartRate,
            maxHr: MAX_HR_DEFAULT,
          },
        };
        sendData(message);
      });

      // Handle disconnection gracefully
      device.addEventListener("gattserverdisconnected", () => {
        setDeviceStatus("Disconnected (Server Lost)");
      });
    } catch (error: unknown) {
      console.error("Bluetooth connection failed:", error);
      let userFriendlyMessage =
        "An unknown error occurred during Bluetooth connection.";
      let suggestChromeFlags = false;

      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotFoundError":
            userFriendlyMessage =
              "No Bluetooth device found. Ensure your device is powered on and nearby. If Bluetooth is disabled, visit chrome://flags to enable it.";
            suggestChromeFlags = true;
            break;
          case "SecurityError":
            userFriendlyMessage =
              "Bluetooth permission denied. Enable Web Bluetooth at chrome://flags, then refresh and try again.";
            suggestChromeFlags = true;
            break;
          case "NetworkError":
            userFriendlyMessage =
              "Bluetooth connection lost. Ensure your device is nearby and powered on.";
            break;
          case "NotSupportedError":
            userFriendlyMessage =
              "Web Bluetooth is not supported. Enable it at chrome://flags (search 'Web Bluetooth'), then refresh the page.";
            suggestChromeFlags = true;
            break;
          case "AbortError":
            userFriendlyMessage =
              "Bluetooth connection attempt was cancelled or aborted by the system.";
            break;
          default:
            userFriendlyMessage = `Bluetooth error: ${error.name}. If unsupported, try enabling Web Bluetooth at chrome://flags.`;
            suggestChromeFlags = true;
        }
      } else if (error instanceof Error) {
        userFriendlyMessage = `Error: ${error.message}. If Web Bluetooth is not available, enable it at chrome://flags.`;
        suggestChromeFlags = true;
      }

      const fullMessage = suggestChromeFlags
        ? `${userFriendlyMessage} [Visit chrome://flags to enable Web Bluetooth]`
        : userFriendlyMessage;

      setDeviceStatus(`Failed: ${fullMessage}`);
    }
  }, [deviceStatus, connectionStatus, sendData]);

  return {
    connectAndStream,
    deviceStatus,
    MAX_HR: MAX_HR_DEFAULT,
    isConnected: deviceStatus.startsWith("Connected"),
  };
};

export default useBluetoothHRM;
