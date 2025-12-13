'use client'

import { useMemo, useState } from 'react'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '../../../utils/visualization'
import ConnectView from './ConnectView'
import { calculateCaloriesBurned } from '../../../utils/health'
import { formatDuration } from '../../../utils/time'

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

  const { connectionStatus, hrmData, timerData } = useWebSocket()

  const handleConnect = () => {
    connectAndStream(userName, userAge)
  }

  const currentHR = hrmData.find((d) => d.name === userName)?.value || 0
  const maxHr = userAge ? 220 - parseInt(userAge) : 190
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  const workoutState = useMemo(() => {
    const { timeElapsed } = timerData
    const isWorkoutActive = timeElapsed > 0
    const averageHr =
      hrmData.reduce((acc, curr) => acc + curr.value, 0) / hrmData.length || 0

    const caloriesBurned = calculateCaloriesBurned(
      averageHr,
      parseInt(userAge || '30'),
      timeElapsed
    )

    return {
      workoutDuration: formatDuration(timeElapsed),
      caloriesBurned: caloriesBurned.toFixed(0),
      isWorkoutActive,
    }
  }, [timerData, hrmData, userAge])

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
      workoutDuration={workoutState.workoutDuration}
      caloriesBurned={workoutState.caloriesBurned}
      isWorkoutActive={workoutState.isWorkoutActive}
    />
  )
}
