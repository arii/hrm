'use client'

import { useState, useEffect } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '@/utils/visualization'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { MeasurementSystem } from '../../../types'
import {
  toKg,
  cmToFeetAndInches,
  feetAndInchesToCm,
} from '../../../utils/units'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [_heightInCm, setHeightInCm] = useLocalStorage(
    'hrm-user-height',
    '175'
  ) // Always CM
  const [_weightInKg, setWeightInKg] = useLocalStorage('hrm-user-weight', '70') // Always KG
  const [gender, setGender] = useLocalStorage<'MALE' | 'FEMALE'>(
    'hrm-user-gender',
    'MALE'
  )
  const [unitSystem, setUnitSystem] = useLocalStorage<MeasurementSystem>(
    'hrm-user-units',
    'IMPERIAL'
  )

  const [displayHeight, setDisplayHeight] = useState({
    cm: '',
    feet: '',
    inches: '',
  })
  const [displayWeight, setDisplayWeight] = useState('')
  const [heightError, setHeightError] = useState<string | null>(null)

  const validateHeight = (cm: number) => {
    if (isNaN(cm) || cm < 100 || cm > 250) {
      return 'Please enter a valid height (100-250 cm)'
    }
    return null
  }

  useEffect(() => {
    const numericHeight = parseFloat(_heightInCm)
    if (isNaN(numericHeight)) return

    if (unitSystem === 'METRIC') {
      setDisplayHeight({
        cm: String(Math.round(numericHeight)),
        feet: '',
        inches: '',
      })
    } else {
      const { feet, inches } = cmToFeetAndInches(numericHeight)
      setDisplayHeight({
        cm: '',
        feet: String(feet),
        inches: String(inches),
      })
    }
  }, [_heightInCm, unitSystem])

  const handleHeightChange = (
    newDisplayValue: Partial<{ cm: string; feet: string; inches: string }>
  ) => {
    setDisplayHeight((prev) => ({ ...prev, ...newDisplayValue }))
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

    const error = validateHeight(cmValue)
    setHeightError(error)

    if (!error && cmValue > 0) {
      setHeightInCm(cmValue.toFixed(2))
    }
  }

  const handleWeightChange = (newDisplayValue: string) => {
    setDisplayWeight(newDisplayValue)
  }

  const handleWeightBlur = () => {
    const numericValue = parseFloat(displayWeight)
    if (!isNaN(numericValue) && numericValue > 0) {
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
    }
  }

  const handleConnect = () => {
    const age = userAge ? parseInt(userAge, 10) : 0
    connectAndStream(userName, age)
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
      userHeight={displayHeight}
      setUserHeight={handleHeightChange}
      onHeightBlur={handleHeightBlur}
      heightError={heightError}
      userWeight={displayWeight}
      setUserWeight={handleWeightChange}
      onWeightBlur={handleWeightBlur}
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
