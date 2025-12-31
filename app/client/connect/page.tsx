'use client'

import { useUserPreferences } from '@/hooks/useUserPreferences'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import { useHrZone } from '@/hooks/useHrZone'

export default function ConnectPage() {
  const [userPreferences, setUserPreferences] = useUserPreferences()

  const {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
    disconnectionReason,
  } = useBluetoothHRM({ userPreferences })

  const { connectionStatus, hrmData } = useWebSocket()

  let deviceStatusMessage = deviceStatus
  if (disconnectionReason === 'timeout') {
    deviceStatusMessage = 'Connection unstable. Trying to reconnect...'
  } else if (disconnectionReason === 'signal_loss') {
    deviceStatusMessage = 'Signal lost. Trying to reconnect...'
  }

  const currentUserData = hrmData.find(
    (d) => d.name === userPreferences.userName
  )
  const currentHR = currentUserData?.value ?? 0
  const totalCalories = currentUserData?.calories ?? 0
  const maxHr = userPreferences.userAge ? 220 - userPreferences.userAge : 190
  const hrZoneProps = useHrZone(currentHR, maxHr)

  const {
    workoutDuration,
    resetWorkout: resetWorkoutSession,
    hasStarted,
    startWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected,
    totalCalories,
  })

  const { calories, resetCalories } = useCalorieCounter(
    currentHR,
    userPreferences.userAge ?? 30,
    userPreferences.userWeight ?? 70,
    workoutStatus === 'running'
  )

  const resetWorkout = () => {
    resetWorkoutSession()
    resetCalories()
  }

  return (
    <ConnectView
      duration={formatDuration(workoutDuration)}
      caloriesBurned={calories}
      userPreferences={userPreferences}
      setUserPreferences={setUserPreferences}
      isConnected={isConnected}
      deviceStatus={deviceStatusMessage}
      batteryLevel={batteryLevel}
      onConnect={connectAndStream}
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
