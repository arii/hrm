'use client'

import { useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import ConnectView from './ConnectView'
import { MeasurementSystem } from '../../../types'
import { toKg, toDisplay } from '../../../utils/units'
import { validateAgeValue, validateWeightValue } from './validation'

export default function ConnectPage() {
  const [userSettings, setUserSettings] = useState({
    userName: 'Test User',
    userAge: 30,
    userWeight: 70,
    gender: 'male',
    unitSystem: 'METRIC' as MeasurementSystem,
  })
  const { userName, userAge, userWeight, gender, unitSystem } = userSettings

  const [displayWeight, setDisplayWeight] = useState(() => {
    const kg = userWeight || 0
    return toDisplay(kg, unitSystem).toString()
  })

  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)
  const [displayHeight, setDisplayHeight] = useState('175')

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

  const { connectionStatus, hrmData } = useWebSocket()

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

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0

  return (
    <ConnectView
      duration={'00:00:00'}
      caloriesBurned={0}
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
      setUserHeight={setDisplayHeight}
      onHeightBlur={() => setHeightError(null)}
      heightError={heightError}
      userWeight={displayWeight}
      setUserWeight={handleWeightChange}
      onWeightBlur={handleWeightBlur}
      weightError={weightError}
      gender={gender}
      setGender={(g) => setUserSettings((prev) => ({ ...prev, gender: g }))}
      unitSystem={unitSystem}
      onUnitChange={handleUnitChange}
      isConnected={false}
      deviceStatus={'Disconnected'}
      batteryLevel={null}
      onConnect={() => {}}
      onDisconnect={() => {}}
      onForgetDevice={() => {}}
      isSupported={true}
      currentHR={currentHR}
      hrZoneProps={{
        percentage: 0,
        progressColor: '#000',
      }}
      connectionStatus={connectionStatus}
      bluetoothConnected={false}
      hasStarted={false}
      onReset={() => {}}
      workoutStatus={'stopped'}
      onStartWorkout={() => {}}
      onEndWorkout={() => {}}
    />
  )
}
