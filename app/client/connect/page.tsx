'use client'

import { useState, useMemo } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { MeasurementSystem } from '../../../types'
import { toKg, toDisplay } from '../../../utils/units'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import { useHrZone } from '@/hooks/useHrZone'
import { useHeightInput } from '@/hooks/useHeightInput'
import { validateAgeValue, validateWeightValue } from './validation'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  // Height logic is now encapsulated in useHeightInput
  const [_weightInKg, setWeightInKg] = useLocalStorage('hrm-user-weight', '70') // Always KG
  const [gender, setGender] = useLocalStorage<'MALE' | 'FEMALE'>(
    'hrm-user-gender',
    'MALE'
  )
  const [unitSystem, setUnitSystem] = useLocalStorage<MeasurementSystem>(
    'hrm-user-units',
    'IMPERIAL'
  )

  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

  const displayWeight = useMemo(() => {
    const kg = parseFloat(_weightInKg)
    if (isNaN(kg)) return ''
    return toDisplay(kg, unitSystem).toString()
  }, [_weightInKg, unitSystem])

  const [transientWeight, setTransientWeight] = useState<string | null>(null)

  // Use the custom hook for height input logic
  const {
    displayHeight,
    updateHeight: handleHeightChange,
    commitHeight: handleHeightBlur,
    error: heightError,
  } = useHeightInput('175', unitSystem)

  const handleAgeBlur = () => {
    const error = validateAgeValue(userAge)
    setAgeError(error)
  }

  const handleWeightChange = (newDisplayValue: string) => {
    setTransientWeight(newDisplayValue)
  }

  const handleWeightBlur = () => {
    const valueToValidate = transientWeight ?? displayWeight
    const error = validateWeightValue(valueToValidate, unitSystem)
    setWeightError(error)

    if (transientWeight !== null) {
      const numericValue = parseFloat(transientWeight)
      if (!error && !isNaN(numericValue) && numericValue > 0) {
        const newKgValue = toKg(numericValue, unitSystem)
        setWeightInKg(newKgValue.toFixed(2))
      }
      setTransientWeight(null) // Reset after commit
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
    userAge: userAge ? parseFloat(userAge) : 0,
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
      setUnitSystem(newUnit)
      // Height hook handles its own transient state reset if unit changes
      // Update display weight to prevent flicker/empty value
      const currentKg = parseFloat(_weightInKg)
      if (!isNaN(currentKg)) {
        const newDisplay = toDisplay(currentKg, newUnit)
        setDisplayWeight(newDisplay.toString())
      } else {
        setDisplayWeight('')
      }
    }
  }

  const handleConnect = () => {
    const age = userAge ? parseFloat(userAge) : 0
    connectAndStream(userName, age)
  }

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const totalCalories = currentUserData?.calories ?? 0
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
      userWeight={transientWeight ?? displayWeight}
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
