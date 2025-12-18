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
  cmToFeetAndInches,
  feetAndInchesToCm,
} from '../../../utils/units'
import { validate } from '../../../utils/validation'

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

  const validateAge = (value: string) => setAgeError(validate(value, 1, 120, 'age'))
  const validateHeight = (value: string) => {
    if (unit === 'metric') {
      setHeightError(validate(value, 100, 250, 'height (cm)'))
    } else {
      const [feet, inches] = value.split('.').map(Number)
      if (isNaN(feet) || isNaN(inches) || feet < 3 || feet > 8 || inches < 0 || inches > 11) {
        setHeightError('Please enter a valid height (3-8 ft, 0-11 in)')
      } else {
        setHeightError(null)
      }
    }
  }
  const validateWeight = (value: string) => {
    if (unit === 'metric') {
      setWeightError(validate(value, 30, 200, 'weight (kg)'))
    } else {
      setWeightError(validate(value, 66, 440, 'weight (lbs)'))
    }
  }

  const handleUnitChange = (newUnit: 'metric' | 'imperial') => {
    if (unit === newUnit) return

    if (newUnit === 'metric') {
      const [feet, inches] = userHeight.split('.').map(Number)
      if (!isNaN(feet) && !isNaN(inches)) {
        const cm = feetAndInchesToCm(feet, inches)
        setUserHeight(cm.toFixed(2))
      }
    } else {
      const cm = parseFloat(userHeight)
      if (!isNaN(cm)) {
        const [feet, inches] = cmToFeetAndInches(cm)
        setUserHeight(`${feet}.${inches}`)
      }
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
