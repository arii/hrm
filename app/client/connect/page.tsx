'use client'

import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/context/WorkoutSessionContext'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')

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
  const {
    allowAutoStart,
    toggleAutoStart,
    startWorkout,
    stopWorkout,
    pauseWorkout,
    resumeWorkout,
    resetWorkout,
    status: workoutStatus,
  } = useWorkoutSession()

  const handleConnect = () => {
    const age = userAge ? parseInt(userAge, 10) : 0
    connectAndStream(userName, age)
  }

  const currentHR = hrmData.find((d) => d.name === userName)?.value || 0
  const maxHr = userAge ? 220 - parseInt(userAge) : 190
  // Simplified props for ConnectView, since the old logic is removed.
  // The old `getHrZoneProps` is not used anymore.
  const hrZoneProps = {
    percentage: maxHr > 0 ? (currentHR / maxHr) * 100 : 0,
    progressColor: 'grey', // Placeholder color
  }

  return (
    <ConnectView
      duration="00:00" // Placeholder
      caloriesBurned={0} // Placeholder
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
      hrZoneProps={hrZoneProps}
      connectionStatus={connectionStatus}
      bluetoothConnected={isConnected}
      hasStarted={workoutStatus !== 'IDLE'}
      onReset={resetWorkout}
      workoutStatus={workoutStatus}
      onStartWorkout={() => startWorkout('MANUAL')}
      onPauseWorkout={pauseWorkout}
      onResumeWorkout={resumeWorkout}
      onEndWorkout={stopWorkout}
      allowAutoStart={allowAutoStart}
      onToggleAutoStart={toggleAutoStart}
    />
  )
}
