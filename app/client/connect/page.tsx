'use client'

import { useState } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { MeasurementSystem } from '../../../types'
import {
  toKg,
  cmToFeetAndInches,
  feetAndInchesToCm,
} from '../../../utils/units'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import { useHrZone } from '@/hooks/useHrZone'
import {
  validateAgeValue,
  validateHeightValue,
  validateWeightValue,
} from './validation'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [_heightInCm, setHeightInCm] = useLocalStorage('hrm-user-height', '175') // Always CM
  const [_weightInKg, setWeightInKg] = useLocalStorage('hrm-user-weight', '70') // Always KG
  const [gender, setGender] = useLocalStorage<'MALE' | 'FEMALE'>(
    'hrm-user-gender',
    'MALE'
  )
  const [unitSystem, setUnitSystem] = useLocalStorage<MeasurementSystem>(
    'hrm-user-units',
    'IMPERIAL'
  )

  const [transientHeightInput, setTransientHeightInput] = useState<{
    cm: string
    feet: string
    inches: string
  } | null>(null)
  const [displayWeight, setDisplayWeight] = useState('')

  const [heightError, setHeightError] = useState<string | null>(null)
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

  // Calculate the display value based on the source of truth (_heightInCm)
  const numericHeight = parseFloat(_heightInCm)
  const derivedDisplayHeight = { cm: '', feet: '', inches: '' }
  if (!isNaN(numericHeight)) {
    if (unitSystem === 'METRIC') {
      derivedDisplayHeight.cm = String(Math.round(numericHeight))
    } else {
      const { feet, inches } = cmToFeetAndInches(numericHeight)
      derivedDisplayHeight.feet = String(feet)
      derivedDisplayHeight.inches = String(inches)
    }
  }

  // If the user is typing, show their input. Otherwise, show the derived value.
  const displayHeight = transientHeightInput ?? derivedDisplayHeight

  const handleHeightChange = (
    newDisplayValue: Partial<{ cm: string; feet: string; inches: string }>
  ) => {
    setTransientHeightInput((prev) => ({
      ...(prev ?? derivedDisplayHeight),
      ...newDisplayValue,
    }))
  }

  const handleHeightBlur = () => {
    let cmValue = 0
    if (unitSystem === 'METRIC') {
      cmValue = parseFloat(displayHeight.cm)
    } else {
      const feet = parseFloat(displayHeight.feet)
      const inches = parseFloat(displayHeight.inches)
      if (!isNaN(feet) && !isNaN(inches)) {
        cmValue = feetAndInchesToCm(feet, inches)
      }
    }

    const error = validateHeightValue(cmValue, unitSystem)
    setHeightError(error)

    if (!error && cmValue > 0) {
      setHeightInCm(cmValue.toFixed(2))
    }
    // Reset transient state after blur to show the canonical value
    setTransientHeightInput(null)
  }

  const handleAgeBlur = () => {
    const error = validateAgeValue(userAge)
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
      setWeightInKg(newKgValue.toFixed(2))
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
  } = useBluetoothHRM()

  const { connectionStatus, hrmData } = useWebSocket()

  let deviceStatusMessage = deviceStatus
  if (disconnectionReason === 'timeout') {
    deviceStatusMessage = 'Connection unstable. Trying to reconnect...'
  } else if (disconnectionReason === 'signal_loss') {
    deviceStatusMessage = 'Signal lost. Trying to reconnect...'
  }

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUnitSystem(newUnit)
      setTransientHeightInput(null) // Reset transient input on unit change
      // Re-validate weight with new unit
      // Note: displayWeight might need conversion here if we wanted to be fancy,
      // but simpler to let user re-enter or let the effect update it (but displayWeight is local state).
      // Ideally we should convert displayWeight. But for now, reset it?
      // Or just let the user see the old number in new unit (likely invalid).
      // Let's clear displayWeight so it picks up from stored _weightInKg (converted)
      setDisplayWeight('')
    }
  }

  const handleConnect = () => {
    // Age and weight are parsed as floats for consistency in calorie calculation.
    const age = userAge ? parseFloat(userAge) : 0
    connectAndStream(userName, age)
  }

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const totalCalories = currentUserData?.calories ?? 0
  // Age is parsed as a float for consistency in calorie calculation.
  const maxHr = userAge ? 220 - parseFloat(userAge) : 190
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
    // Age and weight are parsed as floats for consistency in calorie calculation.
    parseFloat(userAge) || 30,
    parseFloat(_weightInKg) || 70,
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
      userAge={userAge}
      setUserAge={setUserAge}
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
      setGender={setGender}
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
