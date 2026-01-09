'use client'
import { useState, useCallback, useMemo } from 'react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator'
import { useHrZone } from '@/hooks/useHrZone'
import { useUserSettingsForm } from '@/hooks/useUserSettingsForm'
import { useHrmBroadcaster } from '@/hooks/useHrmBroadcaster'
import { useAutoConnect } from '@/hooks/useAutoConnect'
import logger from '@/utils/logger'
export default function ConnectPage() {
  const {
    userName,
    userAge,
    userWeight,
    gender,
    unitSystem,
    setUserSettings,
    displayWeight,
    ageError,
    weightError,
    displayHeight,
    handleHeightChange,
    handleHeightBlur,
    heightError,
    handleAgeBlur,
    handleWeightChange,
    handleWeightBlur,
    handleUnitChange,
  } = useUserSettingsForm()
  const [currentHR, setCurrentHR] = useState(0)
  const { connectionStatus } = useWebSocket()
  const {
    calories,
    processHeartRate,
    reset: resetCalculator,
  } = useCalorieCalculator({
    age: userAge || 30,
    weightKg: userWeight || 70,
  })
  useHrmBroadcaster({ currentHR, calories })
  const {
    workoutDuration,
    resetWorkout: resetWorkoutSession,
    hasStarted,
    startWorkout,
    pauseWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected: false,
    totalCalories: calories,
  })
  const handleHeartRateUpdate = useCallback(
    (heartRate: number) => {
      logger.debug({ heartRate }, 'HR update')
      setCurrentHR(heartRate)
      if (workoutStatus === 'running') {
        processHeartRate(heartRate)
      }
    },
    [processHeartRate, workoutStatus]
  )
  const {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isDataStale,
    isSupported,
    disconnectionReason,
    signalPeriodMs,
  } = useBluetoothHRM({
    userName,
    userAge: userAge || 0,
    onHeartRateUpdate: handleHeartRateUpdate,
    onConnect: startWorkout,
  })
  useAutoConnect({ autoConnect, isConnected, isSupported })
  const deviceStatusMessage = useMemo(() => {
    if (disconnectionReason === 'timeout')
      return 'Connection unstable. Trying to reconnect...'
    if (disconnectionReason === 'signal_loss')
      return 'Signal lost. Trying to reconnect...'
    return deviceStatus
  }, [deviceStatus, disconnectionReason])
  const handleConnect = useCallback(
    () => connectAndStream(userName, userAge || 0),
    [connectAndStream, userName, userAge]
  )
  const maxHr = userAge ? 220 - userAge : 190
  const hrZoneProps = useHrZone(currentHR, maxHr)
  const resetWorkout = useCallback(() => {
    resetWorkoutSession()
    resetCalculator()
  }, [resetWorkoutSession, resetCalculator])
  return (
    <ConnectView
      duration={formatDuration(workoutDuration)}
      caloriesBurned={calories}
      userName={userName}
      setUserName={(name) =>
        setUserSettings((prev) => ({ ...prev, userName: name }))
      }
      userAge={String(userAge || '')}
      setUserAge={(age) =>
        setUserSettings((prev) => ({ ...prev, userAge: Number(age) }))
      }
      onAgeBlur={handleAgeBlur}
      ageError={ageError}
      userHeight={displayHeight}
      setUserHeight={handleHeightChange}
      onHeightBlur={handleHeightBlur}
      heightError={heightError}
      userWeight={displayWeight || ''}
      setUserWeight={handleWeightChange}
      onWeightBlur={handleWeightBlur}
      weightError={weightError}
      gender={gender}
      setGender={(g) => setUserSettings((prev) => ({ ...prev, gender: g }))}
      unitSystem={unitSystem}
      onUnitChange={handleUnitChange}
      isConnected={isConnected}
      isDataStale={isDataStale}
      deviceStatus={deviceStatusMessage}
      batteryLevel={batteryLevel}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      onForgetDevice={forgetDevice}
      isSupported={isSupported}
      signalPeriodMs={signalPeriodMs}
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
      onPauseWorkout={pauseWorkout}
      onEndWorkout={endWorkout}
    />
  )
}
