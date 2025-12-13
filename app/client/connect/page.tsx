'use client'

import { useState, useEffect } from 'react'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import useLocalStorage from '../../../hooks/useLocalStorage' // Import this
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '../../../utils/visualization'
import ConnectView from './ConnectView'

export default function ConnectPage() {
  // Use persistent storage instead of transient state
  const [userName, setUserName] = useLocalStorage<string>('hrm_user_name', '')
  const [userAge, setUserAge] = useLocalStorage<string>('hrm_user_age', '')

  // Hydration mismatch fix: prevent rendering persistent data until client-side
  const [isMounted, setIsMounted] = useState(() => false)
  useEffect(() => setIsMounted(true), [])

  const {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
  } = useBluetoothHRM()

  const { connectionStatus, hrmData } = useWebSocket()

  // Auto-connect Effect
  useEffect(() => {
    // Attempt connection only if:
    // 1. We have stored credentials
    // 2. We are supported and not already connected
    // 3. WebSocket is ready
    if (
      isMounted &&
      isSupported &&
      userName &&
      !isConnected &&
      connectionStatus === 'Connected'
    ) {
      // Pass 'true' for isAutoConnect to prevent the picker popup
      connectAndStream(userName, userAge, true)
    }
  }, [
    isMounted,
    isSupported,
    userName,
    userAge,
    isConnected,
    connectionStatus,
    connectAndStream,
  ])

  const handleConnect = () => {
    // Manual connection: pass 'false' (or nothing) to allow picker
    connectAndStream(userName, userAge, false)
  }

  const currentHR = hrmData.find((d) => d.name === userName)?.value || 0
  const maxHr = userAge ? 220 - parseInt(userAge) : 190
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  // Prevent hydration mismatch by using simple initial state before mount
  if (!isMounted) return null

  return (
    <ConnectView
      userName={userName}
      setUserName={setUserName}
      userAge={userAge}
      setUserAge={setUserAge}
      isConnected={isConnected}
      deviceStatus={deviceStatus}
      batteryLevel={batteryLevel}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      onForgetDevice={forgetDevice}
      isSupported={isSupported}
      currentHR={currentHR}
      hrZoneProps={{
        percentage: hrZoneProps.percentage,
        progressColor: hrZoneProps.progressColor,
      }}
      connectionStatus={connectionStatus}
      bluetoothConnected={isConnected}
    />
  )
}
