/**
 * File: app/client/connect/page.tsx
 * Refactored to prioritize HR Data visibility post-connection.
 */
'use client'

import { useCallback } from 'react'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import useAutoConnect from '../../../hooks/useAutoConnect'
import ConnectView from './ConnectView'
import useUserSettings from '@/hooks/useUserSettings'

export default function ConnectPage() {
  const { connectionStatus } = useWebSocket()
  const {
    connectAndStream,
    disconnect,
    deviceStatus,
    isConnected: bluetoothConnected,
    batteryLevel,
    deviceId,
  } = useBluetoothHRM()

  const {
    userName,
    setUserName,
    userAge,
    setUserAge,
    deviceId: savedDeviceId,
    saveSetting,
  } = useUserSettings()

  const autoConnectFn = useCallback(async () => {
    if (userName && userAge) {
      return await connectAndStream(userName, userAge)
    }
    return false
  }, [connectAndStream, userName, userAge])

  const shouldStartAutoConnect =
    !!savedDeviceId &&
    connectionStatus === 'Connected' &&
    !bluetoothConnected &&
    !!userName &&
    !!userAge

  useAutoConnect(autoConnectFn, shouldStartAutoConnect)

  const handleConnect = async () => {
    if (!userName.trim()) return alert('Please enter your name')
    const ageNum = parseInt(userAge)
    if (!userAge.trim() || ageNum < 1 || ageNum > 120)
      return alert('Invalid age')

    saveSetting('userName', userName.trim())
    saveSetting('userAge', userAge.trim())
    const success = await connectAndStream(userName, userAge)
    if (success && deviceId) {
      saveSetting('deviceId', deviceId)
    }
  }

  const handleDisconnect = () => {
    saveSetting('deviceId', '')
    disconnect()
  }

  const handleResetServer = () => {
    // Implement server reset logic if needed, e.g., via WebSocket
  }

  const { hrmData } = useWebSocket()
  const currentUserData = hrmData.find((d) => d.clientId === deviceId)
  const currentHR = currentUserData?.value ?? 0

  return (
    <ConnectView
      userName={userName}
      setUserName={setUserName}
      userAge={userAge}
      setUserAge={setUserAge}
      isConnected={bluetoothConnected}
      deviceStatus={deviceStatus}
      batteryLevel={batteryLevel}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      onResetServer={handleResetServer}
      currentHR={currentHR}
      connectionStatus={connectionStatus}
      bluetoothConnected={bluetoothConnected}
      clientId={deviceId || ''}
    />
  )
}
