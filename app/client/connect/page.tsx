// app/client/connect/page.tsx
'use client'

import React from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { useHrZone } from '@/hooks/useHrZone'
import ConnectView from './ConnectView'

export default function ConnectPage() {
  const [userName] = useLocalStorage('hrm-user-name', '')
  const [userAge] = useLocalStorage('hrm-user-age', '')
  const [weightInKg] = useLocalStorage('hrm-user-weight', '70') // Always KG

  const {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
    disconnectionReason,
  } = useBluetoothHRM()

  const { connectionStatus, hrmData } = useWebSocket()

  const handleConnect = () => {
    const age = userAge ? parseFloat(userAge) : 0
    connectAndStream(userName, age)
  }

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const maxHr = userAge ? 220 - parseFloat(userAge) : 190
  const hrZoneProps = useHrZone(currentHR, maxHr)

  return (
    <ConnectView
      userName={userName}
      userAge={userAge}
      weightInKg={weightInKg}
      isConnected={isConnected}
      isSupported={isSupported}
      deviceStatus={deviceStatus}
      batteryLevel={batteryLevel}
      currentHR={currentHR}
      hrZoneProps={{
        percentage: hrZoneProps.percentage,
        progressColor: hrZoneProps.progressColor,
      }}
      connectionStatus={connectionStatus}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      onForgetDevice={forgetDevice}
      disconnectionReason={disconnectionReason}
    />
  )
}
