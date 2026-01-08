/**
 * @file useBluetoothHRM.ts
 * @description This file exports a custom React hook, `useBluetoothHRM`, for managing
 * interactions with Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 * It encapsulates the logic for device discovery, connection, disconnection,
 * data streaming, and automatic reconnection on signal loss.
 */
import { useCallback, useState, useRef, useEffect } from 'react'
import {
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import isEqual from 'lodash.isequal'
import { calculateMaxHr } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import { getCookie, setCookie } from '@/utils/cookies'
import {
  HR_SERVICE_UUID,
  BATTERY_SERVICE_UUID,
} from '@/lib/bluetoothUtils'
import { useGattConnection } from './useGattConnection'
import { useGattCharacteristics } from './useGattCharacteristics'
import { useReconnection } from './useReconnection'

/**
 * @interface UseBluetoothHRMProps
 * @description Props for configuring the useBluetoothHRM hook.
 */
interface UseBluetoothHRMProps {
  dataLivenessTimeoutMs?: number
  throttleMs?: number
  userName?: string | null
  userAge?: number | null
  onHeartRateUpdate?: (heartRate: number) => void
  onConnect?: () => void
}

type DisconnectionReason = 'manual' | 'timeout' | 'signal_loss' | null

/**
 * @hook useBluetoothHRM
 * @description A comprehensive hook for managing Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 */
const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const {
    dataLivenessTimeoutMs = 10000,
    userName,
    userAge,
    onHeartRateUpdate,
    onConnect,
  } = props
  const { sendData, connectionStatus } = useWebSocket()

  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason>(null)
  const disconnectionReasonRef = useRef(disconnectionReason)
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [isDataStale, setIsDataStale] = useState(false)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const lastDataTime = useRef<number>(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 })
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null)
  const onConnectRef = useRef(onConnect)
  const sendDataRef = useRef(sendData)

  const {
    connect: gattConnect,
    disconnect: gattDisconnect,
    server: gattServer,
    status: gattStatus,
  } = useGattConnection()

  const { setupCharacteristics, batteryLevel } = useGattCharacteristics({
    server: gattServer,
    onHeartRateUpdate: (heartRate) => {
      lastDataTime.current = Date.now()
      onHeartRateUpdate?.(heartRate)
    },
  })

  const reconnect = useCallback(async () => {
    if (deviceRef.current) {
      const server = await gattConnect(deviceRef.current)
      if (server) {
        await setupCharacteristics()
      }
    }
  }, [gattConnect, setupCharacteristics])

  const {
    startReconnecting,
    stopReconnecting,
    isReconnecting,
    reconnectionStatus,
    reconnectionReason,
  } = useReconnection({ onReconnect: reconnect })

  useEffect(() => {
    disconnectionReasonRef.current = disconnectionReason
  }, [disconnectionReason])

  useEffect(() => {
    onConnectRef.current = onConnect
  }, [onConnect])

  useEffect(() => {
    sendDataRef.current = sendData
  }, [sendData])

  useEffect(() => {
    userDetailsRef.current = { name: userName || '', age: userAge || 0 }
  }, [userName, userAge])

  useEffect(() => {
    if (deviceStatus.startsWith('Connected')) {
      const { name, age } = userDetailsRef.current
      const calculatedMaxHr = calculateMaxHr(age)
      const deviceName = deviceRef.current?.name || 'Unknown'

      const metadataData: HrmMetadataUpdateData = {
        maxHr: calculatedMaxHr,
        name: name || `Bluetooth HRM (${deviceName})`,
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

  useEffect(() => {
    if (isReconnecting && reconnectionStatus) {
      setDeviceStatus(reconnectionStatus)
    }
  }, [isReconnecting, reconnectionStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        gattStatus === 'connected' &&
        lastDataTime.current > 0 &&
        !isReconnecting
      ) {
        const timeSinceLastData = Date.now() - lastDataTime.current
        if (timeSinceLastData > dataLivenessTimeoutMs && !isDataStale) {
          setIsDataStale(true)
          setDisconnectionReason('timeout')
          if (deviceRef.current) {
            gattDisconnect(deviceRef.current)
          }
        } else if (timeSinceLastData <= dataLivenessTimeoutMs && isDataStale) {
          setIsDataStale(false)
        }
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [
    dataLivenessTimeoutMs,
    isDataStale,
    gattStatus,
    isReconnecting,
    gattDisconnect,
  ])

  const onDisconnected = useCallback(() => {
    if (!isManualDisconnect.current && deviceRef.current) {
      startReconnecting(disconnectionReasonRef.current || 'signal_loss')
    } else {
      setDeviceStatus('Disconnected')
    }
  }, [startReconnecting])

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    setDisconnectionReason('manual')
    stopReconnecting()
    if (deviceRef.current) {
      gattDisconnect(deviceRef.current)
    }
    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })
    setDeviceStatus('Disconnected')
    setSavedDevice(null)
    deviceRef.current = null
  }, [gattDisconnect, stopReconnecting])

  const forgetDevice = useCallback(async () => {
    disconnect()
    setCookie('hrm_device_id', '', -1)
  }, [disconnect])

  const handleConnectionError = useCallback((error: unknown) => {
    let msg = 'An unknown error occurred.'
    if (error instanceof DOMException) {
      msg = `Bluetooth error: ${error.name}`
    } else if (error instanceof Error) {
      msg = `Error: ${error.message}`
    }
    setDeviceStatus(`Failed: ${msg}`)
    logger.error({ error }, msg)
  }, [])

  const connectAndStream = useCallback(
    async (
      userNameFromArgs?: string,
      userAgeFromArgs?: number
    ): Promise<void> => {
      userDetailsRef.current = {
        name: userNameFromArgs || userName || '',
        age: userAgeFromArgs || userAge || 0,
      }

      if (gattStatus === 'connected') return
      if (connectionStatus !== 'Connected') {
        throw new Error('WebSocket not connected')
      }

      try {
        let device: BluetoothDevice | null = savedDevice

        if (!device) {
          const savedDeviceId = getCookie('hrm_device_id')
          if (savedDeviceId && navigator.bluetooth?.getDevices) {
            const devices = await navigator.bluetooth.getDevices()
            device = devices.find((d) => d.id === savedDeviceId) || null
          }
        }

        if (!device) {
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }

        if (device) {
          deviceRef.current = device
          setDeviceStatus(`Connecting to: ${device.name || 'Device'}...`)
          const server = await gattConnect(device)
          if (server) {
            device.addEventListener('gattserverdisconnected', onDisconnected)
            await setupCharacteristics()
            setDeviceStatus(`Connected to: ${device.name}`)
            setSavedDevice(device)
            setCookie('hrm_device_id', device.id)
            isManualDisconnect.current = false
            setDisconnectionReason(null)
            stopReconnecting()
            onConnectRef.current?.()
          }
        }
      } catch (error) {
        handleConnectionError(error)
        throw error
      }
    },
    [
      connectionStatus,
      savedDevice,
      gattConnect,
      handleConnectionError,
      userName,
      userAge,
      onDisconnected,
      setupCharacteristics,
      stopReconnecting,
      gattStatus,
    ]
  )

  const autoConnect = useCallback(async (): Promise<void> => {
    try {
      logger.info('Starting auto-connect to saved device...')
      setDeviceStatus('Connecting to saved device...')
      await connectAndStream(undefined, undefined)
      logger.info('Auto-connect succeeded')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.info(
        { errorMsg },
        'Auto-connect failed, user can connect manually'
      )
      setDeviceStatus(
        'Auto-connect failed. Use Connect button to select device.'
      )
    }
  }, [connectAndStream])

  return {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: gattStatus === 'connected' && !isReconnecting,
    isDataStale,
    isSupported,
    disconnectionReason: isReconnecting
      ? reconnectionReason
      : disconnectionReason,
  }
}

export default useBluetoothHRM
