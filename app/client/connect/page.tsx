'use client'

import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '@/utils/visualization'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useEffect } from 'react'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [userHeight, setUserHeight] = useLocalStorage('hrm-user-height', '')
  const [userWeight, setUserWeight] = useLocalStorage('hrm-user-weight', '')
  const [persistedCalories, setPersistedCalories] = useLocalStorage(
    'totalAccumulatedCalories',
    0
  )

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

  let deviceStatusMessage = deviceStatus
  if (disconnectionReason === 'timeout') {
    deviceStatusMessage = 'Connection unstable. Trying to reconnect...'
  } else if (disconnectionReason === 'signal_loss') {
    deviceStatusMessage = 'Signal lost. Trying to reconnect...'
  }

  const handleConnect = () => {
    const age = userAge ? parseInt(userAge, 10) : 0
    connectAndStream(userName, age)
  }

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const serverCalories = currentUserData?.calories ?? 0
  const maxHr = userAge ? 220 - parseInt(userAge) : 190
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  // Use the server value if it's non-zero, otherwise fall back to the persisted value.
  const displayCalories = serverCalories > 0 ? serverCalories : persistedCalories

  useEffect(() => {
    // Persist the latest calorie count whenever it changes.
    if (serverCalories > 0) {
      setPersistedCalories(serverCalories)
    }
  }, [serverCalories, setPersistedCalories])

  const {
    workoutDuration,
    accumulatedCalories,
    resetWorkout,
    hasStarted,
    startWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected,
    totalCalories: displayCalories,
  })

  return (
    <ConnectView
      duration={formatDuration(workoutDuration)}
      accumulatedCalories={accumulatedCalories}
      userName={userName}
      setUserName={setUserName}
      userAge={userAge}
      setUserAge={setUserAge}
      userHeight={userHeight}
      setUserHeight={setUserHeight}
      userWeight={userWeight}
      setUserWeight={setUserWeight}
      isConnected={isConnected}
      deviceStatus={deviceStatusMessage}
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
      hasStarted={hasStarted}
      onReset={resetWorkout}
      workoutStatus={workoutStatus}
      onStartWorkout={startWorkout}
      onEndWorkout={endWorkout}
    />
  )
}
