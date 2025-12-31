'use client'

import { useState, useEffect } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useUserPhysicalProfile } from '@/context/UserPhysicalProfileContext'
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
import { calculateMaxHr } from '@/lib/hrm/calculators'
import { validateAgeValue, validateWeightValue } from './validation'
import { useUserPreferences } from '@/hooks'

export default function ConnectPage() {
  const { profile, updateProfile, isLoading } = useUserPhysicalProfile()
  const {
    age,
    weight: weightInKg,
    gender,
    unitSystem,
    maxHr: profileMaxHr,
  } = profile
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')

  const [displayWeight, setDisplayWeight] = useState(() =>
    toDisplay(weightInKg, unitSystem).toString()
  )
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [localAge, setLocalAge] = useState(age.toString())
  const [localMaxHr, setLocalMaxHr] = useState(
    profileMaxHr ? profileMaxHr.toString() : ''
  )

  useEffect(() => {
    setLocalAge(age.toString())
    setDisplayWeight(toDisplay(weightInKg, unitSystem).toString())
    setLocalMaxHr(profileMaxHr ? profileMaxHr.toString() : '')
  }, [profile])

  const {
    displayHeight,
    updateHeight: handleHeightChange,
    commitHeight: handleHeightBlur,
    error: heightError,
  } = useHeightInput('175', unitSystem)

  const handleAgeBlur = () => {
    const error = validateAgeValue(localAge)
    setAgeError(error)
    if (!error) {
      updateProfile({ age: parseInt(localAge, 10) })
    }
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
    userAge: age,
  })

  const { connectionStatus, hrmData } = useWebSocket()

  let deviceStatusMessage = deviceStatus
  if (disconnectionReason === 'timeout') {
    deviceStatusMessage = 'Connection unstable. Trying to reconnect...'
  } else if (disconnectionReason === 'signal_loss') {
    deviceStatusMessage = 'Signal lost. Trying to reconnect...'
  }

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      updateProfile({ unitSystem: newUnit })
    }
  }

  const handleConnect = () => {
    connectAndStream(userName, age)
  }
  const [prefs, setPrefs] = useUserPreferences()

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const maxHr = profileMaxHr || calculateMaxHr(age)
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
      userName={prefs.userName}
      setUserName={(name: string) => setPrefs({ ...prefs, userName: name })}
      userAge={localAge}
      setUserAge={setLocalAge}
      onAgeBlur={handleAgeBlur}
      ageError={ageError}
      maxHr={localMaxHr}
      setMaxHr={setLocalMaxHr}
      userHeight={displayHeight}
      setUserHeight={handleHeightChange}
      onHeightBlur={handleHeightBlur}
      heightError={heightError}
      userWeight={displayWeight}
      setUserWeight={handleWeightChange}
      onWeightBlur={handleWeightBlur}
      weightError={weightError}
      gender={gender}
      setGender={(gender: 'MALE' | 'FEMALE') => updateProfile({ gender })}
      unitSystem={unitSystem}
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
