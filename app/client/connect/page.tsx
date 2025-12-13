'use client'

import { useState } from 'react'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '../../../utils/visualization'
import ConnectView from './ConnectView'

export default function ConnectPage() {
  const [userName, setUserName] = useState('')
  const [userAge, setUserAge] = useState('')

  // Destructure the new values from your updated hook
  const {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported, // Ensure this is destructured
  } = useBluetoothHRM()

  const { connectionStatus, hrmData, timerState } = useWebSocket()

  const handleConnect = () => {
    connectAndStream(userName, userAge)
  }

  const currentHR = hrmData.find((d) => d.name === userName)?.value || 0
  const maxHr = userAge ? 220 - parseInt(userAge) : 190
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

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
      // Pass the new props here:
      onForgetDevice={forgetDevice}
      isSupported={isSupported}
      currentHR={currentHR}
      hrZoneProps={{
        percentage: hrZoneProps.percentage,
        progressColor: hrZoneProps.progressColor,
      }}
      connectionStatus={connectionStatus}
      bluetoothConnected={isConnected}
      workoutDuration={timerState?.workoutDuration || '00:00:00'}
      caloriesBurned={timerState?.caloriesBurned || 0}
    />
  )
}
