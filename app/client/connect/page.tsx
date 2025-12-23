'use client'

import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '@/utils/visualization'
import { formatDuration } from '@/lib/shared/utils/time'
import { calculateMaxHr } from '@/lib/shared/utils/health'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [userHeight, setUserHeight] = useLocalStorage('hrm-user-height', '')
  const [userWeight, setUserWeight] = useLocalStorage('hrm-user-weight', '')

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
  // Derive calories directly from the WebSocket source of truth, defaulting to 0.
  const accumulatedCalories = currentUserData?.calories ?? 0
  const maxHr = calculateMaxHr(userAge)
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  const {
    workoutDuration,
    resetWorkout,
    hasStarted,
    startWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected,
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
