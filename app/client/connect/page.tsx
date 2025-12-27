'use client'

import { useState } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import useMultiDeviceBluetooth from '@/hooks/useMultiDeviceBluetooth'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { MeasurementSystem } from '../../../types'
import { toKg } from '../../../utils/units'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [userHeight, setUserHeight] = useLocalStorage('hrm-user-height', '')
  const [_weightInKg, setWeightInKg] = useLocalStorage('hrm-user-weight', '70') // Always KG
  const [gender, setGender] = useLocalStorage<'MALE' | 'FEMALE'>(
    'hrm-user-gender',
    'MALE'
  )
  const [unitSystem, setUnitSystem] = useLocalStorage<MeasurementSystem>(
    'hrm-user-units',
    'IMPERIAL'
  )

  const [displayWeight, setDisplayWeight] = useState('')

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
    connectedDevices,
    connectNewDevice,
    disconnectDevice,
    forgetDevice,
    isSupported,
  } = useMultiDeviceBluetooth()

  const { connectionStatus, hrmData } = useWebSocket()

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUnitSystem(newUnit)
    }
  }

  const isConnected = Object.values(connectedDevices).some((d) =>
    d.status.startsWith('Connected')
  )

  const currentUserData = hrmData.find((d) => d.name === userName)
  const totalCalories = currentUserData?.calories ?? 0

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
      userWeight={displayWeight}
      setUserWeight={handleWeightChange}
      onWeightBlur={handleWeightBlur}
      gender={gender}
      setGender={setGender}
      unitSystem={unitSystem}
      onUnitChange={handleUnitChange}
      connectedDevices={connectedDevices}
      onConnect={connectNewDevice}
      onDisconnect={disconnectDevice}
      onForgetDevice={forgetDevice}
      isSupported={isSupported}
      connectionStatus={connectionStatus}
      hasStarted={hasStarted}
      onReset={resetWorkout}
      workoutStatus={workoutStatus}
      onStartWorkout={startWorkout}
      onEndWorkout={endWorkout}
    />
  )
}
