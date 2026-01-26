import { useCallback, useState, useRef, useEffect } from 'react'
import {
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import isEqual from 'lodash.isequal'
import { calculateMaxHr } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import useBluetoothConnection from './useBluetoothConnection'
import useGattSubscription from './useGattSubscription'
import useDataLiveness from './useDataLiveness'
import useSignalQuality from './useSignalQuality'

interface UseBluetoothHRMProps {
  dataLivenessTimeoutMs?: number
  userName?: string | null
  userAge?: number | null
  onHeartRateUpdate?: (heartRate: number) => void
  onConnect?: () => void
}

const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const {
    dataLivenessTimeoutMs = 10000,
    userName,
    userAge,
    onHeartRateUpdate,
    onConnect,
  } = props
  const { sendData, connectionStatus } = useWebSocket()
  const [gattServer, setGattServer] =
    useState<BluetoothRemoteGATTServer | null>(null)

  const userDetailsRef = useRef({ name: userName || '', age: userAge || 0 })
  const lastSentMetadataRef = useRef<HrmMetadataUpdateData | null>(null)
  const onHeartRateUpdateRef = useRef(onHeartRateUpdate)
  const onConnectRef = useRef(onConnect)

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate
  }, [onHeartRateUpdate])

  useEffect(() => {
    onConnectRef.current = onConnect
  }, [onConnect])

  const handleConnect = useCallback((server: BluetoothRemoteGATTServer) => {
    setGattServer(server)
    onConnectRef.current?.()
  }, [])

  const handleDisconnect = useCallback(() => {
    setGattServer(null)
    sendData({ type: 'HRM_INPUT', data: { value: null } })
  }, [sendData])

  const bluetoothConnection = useBluetoothConnection({
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  })

  const handleHeartRateUpdate = useCallback(
    (heartRate: number) => {
      onHeartRateUpdateRef.current?.(heartRate)
      sendData({ type: 'HRM_INPUT', data: { value: heartRate } })
    },
    [sendData]
  )

  const gattSubscription = useGattSubscription({
    server: gattServer,
    onHeartRateUpdate: handleHeartRateUpdate,
  })

  const handleStaleData = useCallback(() => {
    logger.warn(
      'Stale data detected, forcing disconnect to trigger reconnection.'
    )
    bluetoothConnection.disconnect()
  }, [bluetoothConnection])

  const dataLiveness = useDataLiveness({
    lastDataTimestamp: gattSubscription.lastDataTimestamp,
    isConnected: bluetoothConnection.isConnected,
    dataLivenessTimeoutMs,
    onStale: handleStaleData,
  })

  const signalQuality = useSignalQuality({
    lastDataTimestamp: gattSubscription.lastDataTimestamp,
    isConnected: bluetoothConnection.isConnected,
    isDataStale: dataLiveness.isDataStale,
  })

  useEffect(() => {
    userDetailsRef.current = { name: userName || '', age: userAge || 0 }
  }, [userName, userAge])

  useEffect(() => {
    if (bluetoothConnection.isConnected) {
      const { name, age } = userDetailsRef.current
      const calculatedMaxHr = calculateMaxHr(age)
      const deviceName = bluetoothConnection.device?.name || 'Unknown'

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
  }, [
    userName,
    userAge,
    bluetoothConnection.isConnected,
    bluetoothConnection.device,
    sendData,
  ])

  const connectAndStream = useCallback(
    async (
      userNameFromArgs?: string,
      userAgeFromArgs?: number
    ): Promise<void> => {
      userDetailsRef.current = {
        name: userNameFromArgs || userName || '',
        age: userAgeFromArgs || userAge || 0,
      }

      if (bluetoothConnection.isConnected) return
      if (connectionStatus !== 'Connected') {
        const err = new Error('WebSocket not connected')
        logger.error({ error: err }, 'Cannot connect to HRM')
        throw err
      }

      try {
        await bluetoothConnection.connect()
      } catch (error) {
        logger.error({ error }, 'Failed to connect and stream')
        throw error
      }
    },
    [connectionStatus, bluetoothConnection, userName, userAge]
  )

  const disconnect = useCallback(() => {
    bluetoothConnection.disconnect()
  }, [bluetoothConnection])

  return {
    connectAndStream,
    autoConnect: bluetoothConnection.autoConnect,
    disconnect,
    forgetDevice: bluetoothConnection.forgetDevice,
    deviceStatus: bluetoothConnection.deviceStatus,
    batteryLevel: gattSubscription.batteryLevel,
    isConnected: bluetoothConnection.isConnected,
    isDataStale: dataLiveness.isDataStale,
    isSupported: bluetoothConnection.isSupported,
    signalPeriodMs: signalQuality.signalPeriodMs,
  }
}

export default useBluetoothHRM
