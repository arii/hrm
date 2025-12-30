'use client'

import { useState, useEffect } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { MeasurementSystem } from '@/types/core'
import { toKg, toDisplay } from '@/utils/units'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import { useHrZone } from '@/hooks/useHrZone'
import { useHeightInput } from '@/hooks/useHeightInput'
import { validateAgeValue, validateWeightValue } from './validation'
import { useUserPhysicalProfile } from '@/context/UserPhysicalProfileContext'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const { profile, updateProfile } = useUserPhysicalProfile()

  const [displayWeight, setDisplayWeight] = useState(() =>
    toDisplay(profile.weight, profile.unitSystem).toString()
  )
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

  // Effect to sync displayWeight when unitSystem changes
  useEffect(() => {
    setDisplayWeight(toDisplay(profile.weight, profile.unitSystem).toString())
  }, [profile.unitSystem, profile.weight])

  // Use the custom hook for height input logic
  const {
    displayHeight,
    updateHeight: handleHeightChange,
    commitHeight: handleHeightBlur,
    error: heightError,
  } = useHeightInput(
    '175', // Assuming a default height might need context as well
    profile.unitSystem
  )

  const handleAgeBlur = () => {
    const error = validateAgeValue(profile.age.toString())
    setAgeError(error)
  }

  const handleWeightChange = (newDisplayValue: string) => {
    setDisplayWeight(newDisplayValue)
  }

  const handleWeightBlur = () => {
    const error = validateWeightValue(displayWeight, profile.unitSystem)
    setWeightError(error)

    const numericValue = parseFloat(displayWeight)
    if (!error && !isNaN(numericValue) && numericValue > 0) {
      const newKgValue = toKg(numericValue, profile.unitSystem)
      updateProfile({ weight: newKgValue })
    }
  }

  const {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
    disconnectionReason,
  } = useBluetoothHRM({
    userName,
    userAge: profile.age,
  })

  const { connectionStatus, hrmData } = useWebSocket()

  let deviceStatusMessage = deviceStatus
  if (disconnectionReason === 'timeout') {
    deviceStatusMessage = 'Connection unstable. Trying to reconnect...'
  } else if (disconnectionReason === 'signal_loss') {
    deviceStatusMessage = 'Signal lost. Trying to reconnect...'
  }

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== profile.unitSystem) {
      updateProfile({ unitSystem: newUnit })
    }
  }

  const handleConnect = () => {
    connectAndStream(userName, profile.age)
  }

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const hrZoneProps = useHrZone(currentHR, profile.maxHr || 190)

  const {
    workoutDuration,
    resetWorkout: resetWorkoutSession,
    hasStarted,
    startWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected,
    totalCalories: currentUserData?.calories ?? 0,
  })

  const { calories, resetCalories } = useCalorieCounter(
    currentHR,
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
      userName={userName}
      setUserName={setUserName}
      userAge={profile.age.toString()}
      setUserAge={(age) => updateProfile({ age: parseInt(age, 10) || 0 })}
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
      gender={profile.gender}
      setGender={(gender) => updateProfile({ gender })}
      unitSystem={profile.unitSystem}
      onUnitChange={handleUnitChange}
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
