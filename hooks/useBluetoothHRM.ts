/**
 * @file useBluetoothHRM.ts
 * @description This file exports a custom React hook, `useBluetoothHRM`, for managing
 * interactions with Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 * It encapsulates the logic for device discovery, connection, disconnection,
 * data streaming, and automatic reconnection on signal loss by using the DeviceManager service.
 */
import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import {
  HrmInputData,
  HrmInputMessage,
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import throttle from 'lodash.throttle'
import isEqual from 'lodash.isequal'
import { calculateMaxHr } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import deviceManager, {
  DisconnectionReason,
  DeviceManagerEvent,
} from '@/services/deviceManager'

/**
 * @interface UseBluetoothHRMProps
 * @description Props for configuring the useBluetoothHRM hook.
 */
interface UseBluetoothHRMProps {
  throttleMs?: number
  userName?: string | null
  userAge?: number | null
}

const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const { throttleMs = 250, userName, userAge } = props
  const { sendData, connectionStatus } = useWebSocket()

  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 })
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null)

  const sendDataRef = useRef(sendData)
  useEffect(() => {
    sendDataRef.current = sendData
  }, [sendData])

  useEffect(() => {
    userDetailsRef.current = { name: userName || '', age: userAge || 0 }
  }, [userName, userAge])

  /* eslint-disable react-hooks/refs */
  const throttledSend = useMemo(
    () =>
      throttle((message: HrmInputMessage) => {
        try {
          sendDataRef.current(message)
        } catch (error) {
          logger.error({ error, message }, 'Error sending throttled HRM data.')
        }
      }, throttleMs),
    [throttleMs]
  )
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    const handleDeviceEvent = (event: DeviceManagerEvent) => {
      switch (event.type) {
        case 'statusChange':
          setDeviceStatus(event.payload as string)
          break
        case 'heartRate': {
          const data: HrmInputData = { value: event.payload as number }
          throttledSend({ type: 'HRM_INPUT', data })
          break
        }
        case 'batteryLevel':
          setBatteryLevel(event.payload as number | null)
          break
        case 'disconnected':
          setDisconnectionReason(event.payload as DisconnectionReason)
          break
      }
    }

    deviceManager.on(handleDeviceEvent)

    return () => {
      deviceManager.off(handleDeviceEvent)
      throttledSend.cancel()
    }
  }, [throttledSend])

  useEffect(() => {
    if (deviceStatus.startsWith('Connected')) {
      const { name, age } = userDetailsRef.current
      const calculatedMaxHr = calculateMaxHr(age)

      const metadataData: HrmMetadataUpdateData = {
        maxHr: calculatedMaxHr,
        name: name || `Bluetooth HRM`,
      }
      if (typeof age === 'number') {
        metadataData.age = age
      }

      if (!isEqual(lastSentMetadataRef.current, metadataData)) {
        const metadata: HrmMetadataUpdateMessage = {
          type: 'HRM_METADATA_UPDATE',
          data: metadataData,
        }
        sendData(metadata)
        lastSentMetadataRef.current = metadataData
      }
    }
  }, [userName, userAge, deviceStatus, sendData])

  const connectAndStream = useCallback(async (): Promise<void> => {
    if (deviceStatus.startsWith('Connected')) return
    if (connectionStatus !== 'Connected') {
      const err = new Error('WebSocket not connected')
      setDeviceStatus('Error: WebSocket not connected')
      throw err
    }
    try {
      await deviceManager.connectAndStream()
    } catch (_error) {
      // Error is already handled and status is set by the device manager
    }
  }, [connectionStatus, deviceStatus])

  const disconnect = useCallback(() => {
    deviceManager.disconnect()
  }, [])

  const forgetDevice = useCallback(async () => {
    await deviceManager.forgetDevice()
  }, [])

  return {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: deviceStatus.startsWith('Connected'),
    isSupported,
    disconnectionReason,
  }
}

export default useBluetoothHRM
