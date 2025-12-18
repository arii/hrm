'use client'

import { useState } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '@/utils/visualization'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import {
  kgToLbs,
  lbsToKg,
  cmToFeet,
  feetToCm,
} from '../../../utils/units'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [userHeight, setUserHeight] = useLocalStorage('hrm-user-height', '')
  const [userWeight, setUserWeight] = useLocalStorage('hrm-user-weight', '')
  const [unit, setUnit] = useLocalStorage<'metric' | 'imperial'>(
    'hrm-unit-system',
    'imperial'
  )

  const [ageError, setAgeError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

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

  const validate = (
    value: string,
    min: number,
    max: number,
    name: string,
    setter: (error: string | null) => void
  ) => {
    if (!value || value.trim() === '') {
      setter(null)
      return
    }
    const num = Number(value)
    if (isNaN(num) || num < min || num > max) {
      setter(`Please enter a valid ${name} (${min}-${max})`)
    } else {
      setter(null)
    }
  }

  const validateAge = (value: string) => validate(value, 1, 120, 'age', setAgeError)
  const validateHeight = (value: string) => {
    if (unit === 'metric') {
      validate(value, 100, 250, 'height (cm)', setHeightError)
    } else {
      validate(value, 3.28, 8.2, 'height (ft)', setHeightError)
    }
  }
  const validateWeight = (value: string) => {
    if (unit === 'metric') {
      validate(value, 30, 200, 'weight (kg)', setWeightError)
    } else {
      validate(value, 66, 440, 'weight (lbs)', setWeightError)
    }
  }

  const handleUnitChange = (newUnit: 'metric' | 'imperial') => {
    if (unit === newUnit) return

    const currentHeight = parseFloat(userHeight)
    if (!isNaN(currentHeight)) {
      const newHeight =
        newUnit === 'metric'
          ? feetToCm(currentHeight)
          : cmToFeet(currentHeight)
      setUserHeight(newHeight.toFixed(2))
    }

    const currentWeight = parseFloat(userWeight)
    if (!isNaN(currentWeight)) {
      const newWeight =
        newUnit === 'metric'
          ? lbsToKg(currentWeight)
          : kgToLbs(currentWeight)
      setUserWeight(newWeight.toFixed(2))
    }

    setUnit(newUnit)
  }

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const totalCalories = currentUserData?.calories ?? 0
  const maxHr = userAge ? 220 - parseInt(userAge) : 190
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
      userName={userName}
      setUserName={setUserName}
      userAge={userAge}
      setUserAge={setUserAge}
      userHeight={userHeight}
      setUserHeight={setUserHeight}
      userWeight={userWeight}
      setUserWeight={setUserWeight}
      unit={unit}
      setUnit={handleUnitChange}
      ageError={ageError}
      heightError={heightError}
      weightError={weightError}
      validateAge={validateAge}
      validateHeight={validateHeight}
      validateWeight={validateWeight}
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
