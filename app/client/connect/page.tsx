'use client'

import { useState, useEffect } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { MeasurementSystem, Gender } from '../../../types/core'
import { toKg, toDisplay } from '../../../utils/units'
import { useHrZone } from '@/hooks/useHrZone'
import { useHeightInput } from '@/hooks/useHeightInput'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import { useHrZoneTracker } from '@/hooks/useHrZoneTracker'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'

export default function ConnectPage() {
  const [userSettings, setUserSettings] = useUserSettings()
  const { userName, userAge, userWeight, gender, unitSystem } = userSettings

  const [displayWeight, setDisplayWeight] = useState(() => {
    const kg = userWeight || 0
    return toDisplay(kg, unitSystem).toString()
  })

  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

  const {
    displayHeight,
    updateHeight: handleHeightChange,
    commitHeight: handleHeightBlur,
    error: heightError,
  } = useHeightInput('175', unitSystem)

  const handleAgeBlur = () => {
    const error = validateAgeValue(String(userAge || ''))
    setAgeError(error)
  }

  const handleWeightChange = (newDisplayValue: string) => {
    setDisplayWeight(newDisplayValue)
  }

  const handleWeightBlur = () => {
    const error = validateWeightValue(displayWeight, unitSystem)
    setWeightError(error)

    const numericValue = parseFloat(displayWeight)
    if (!error && !isNaN(numericValue) && numericValue > 0) {
      const newKgValue = toKg(numericValue, unitSystem)
      setUserSettings((prev) => ({ ...prev, userWeight: newKgValue }))
    }
  }

  const {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
    disconnectionReason,
    rawHeartRate,
  } = useBluetoothHRM()

  const {
    workoutDuration,
    resetWorkout: resetWorkoutSession,
    hasStarted,
    startWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected: isConnected,
  })

  const { calories, smoothedHeartRate, resetCalories } = useCalorieCounter(
    rawHeartRate,
    userAge || 0,
    userWeight || 0,
    gender || 'MALE',
    workoutStatus === 'running'
  )

  const { connectionStatus } = useWebSocket()
  const [hrHistory, setHrHistory] = useState<{ time: number; hr: number }[]>([])

  const maxHr = userAge ? 220 - userAge : 190
  const zoneDurations = useHrZoneTracker(
    smoothedHeartRate,
    maxHr,
    workoutStatus === 'running'
  )


  useEffect(() => {
    if (!isConnected && isSupported && connectionStatus === 'Connected') {
      autoConnect()
    }
  }, [isConnected, isSupported, connectionStatus, autoConnect])

  let deviceStatusMessage = deviceStatus
  if (disconnectionReason === 'timeout') {
    deviceStatusMessage = 'Connection unstable. Trying to reconnect...'
  } else if (disconnectionReason === 'signal_loss') {
    deviceStatusMessage = 'Signal lost. Trying to reconnect...'
  }

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
      const currentKg = userWeight || 0
      if (!isNaN(currentKg)) {
        const newDisplay = toDisplay(currentKg, newUnit)
        setDisplayWeight(newDisplay.toString())
      } else {
        setDisplayWeight('')
      }
    }
  }

  const handleConnect = () => {
    connectAndStream()
  }

  const hrZoneProps = useHrZone(smoothedHeartRate, maxHr)

  const resetWorkout = () => {
    resetWorkoutSession()
    resetCalories()
    setHrHistory([])
  }

  const handleEndWorkout = () => {
    endWorkout(calories)
  }

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
      userWeight={displayWeight}
      setUserWeight={handleWeightChange}
      onWeightBlur={handleWeightBlur}
      weightError={weightError}
      gender={gender}
      setGender={(g: Gender) =>
        setUserSettings((prev) => ({ ...prev, gender: g }))
      }
      unitSystem={unitSystem}
      onUnitChange={handleUnitChange}
      isConnected={isConnected}
      deviceStatus={deviceStatusMessage}
      batteryLevel={batteryLevel}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      onForgetDevice={forgetDevice}
      isSupported={isSupported}
      currentHR={smoothedHeartRate}
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
      onEndWorkout={handleEndWorkout}
      hrHistory={hrHistory}
      setHrHistory={setHrHistory}
      zoneDurations={zoneDurations}
    />
  )
}
