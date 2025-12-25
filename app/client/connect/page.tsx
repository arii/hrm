'use client'

import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '@/utils/visualization'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useUserSettings } from '@/context/UserSettingsContext'
import { DEFAULT_USER_AGE, DEFAULT_USER_NAME } from '@/utils/constants'

export default function ConnectPage() {
  const [userSettings, setUserSettings] = useUserSettings()
  const { userName, userAge, userWeight } = userSettings

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
    connectAndStream(
      userName ?? DEFAULT_USER_NAME,
      userAge ?? DEFAULT_USER_AGE,
      userWeight ?? undefined
    )
  }

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const totalCalories = currentUserData?.calories ?? 0
  const maxHr = userAge ? 220 - userAge : 190
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  const {
    workoutDuration,
    caloriesBurned,
    resetWorkout,
    hasStarted,
    startWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected,
    totalCalories,
  })

  return (
    <ConnectView
      duration={formatDuration(workoutDuration)}
      caloriesBurned={caloriesBurned}
      userName={userName ?? DEFAULT_USER_NAME}
      setUserName={(name) =>
        setUserSettings((prev) => ({ ...prev, userName: name }))
      }
      userAge={(userAge ?? '').toString()}
      setUserAge={(age) => {
        const numAge = age === '' ? null : parseInt(age, 10)
        setUserSettings((prev) => ({
          ...prev,
          userAge: isNaN(numAge as number) ? null : numAge,
        }))
      }}
      userHeight={''} // Placeholder, not part of this task
      setUserHeight={() => {}} // Placeholder, not part of this task
      userWeight={(userWeight ?? '').toString()}
      setUserWeight={(weight) => {
        const numWeight = weight === '' ? null : parseInt(weight, 10)
        setUserSettings((prev) => ({
          ...prev,
          userWeight: isNaN(numWeight as number) ? null : numWeight,
        }))
      }}
      unitSystem={userSettings.unitSystem}
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
