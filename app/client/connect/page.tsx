'use client'

import { useState, useEffect } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { MeasurementSystem } from '../../../types/core'
import { toKg, toDisplay } from '../../../utils/units'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import { useHrZone } from '@/hooks/useHrZone'
import { useHeightInput } from '@/hooks/useHeightInput'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import RealTimeChart from './components/RealTimeChart'
import ZoneDistributionTable from './components/ZoneDistributionTable'

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
  } = useBluetoothHRM({
    userName,
    userAge: userAge || 0,
  })

  const { connectionStatus, hrmData } = useWebSocket()

  useEffect(() => {
    // On initial mount, try to auto-connect to a saved device if not already connected.
    // This provides a smoother experience for returning users.
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
    connectAndStream(userName, userAge || 0)
  }

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const totalCalories = currentUserData?.calories ?? 0
  const maxHr = userAge ? 220 - userAge : 190
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
    userAge || 30,
    userWeight || 70,
    workoutStatus === 'running'
  )

  const {
    history,
    zoneDistribution,
    addDataPoint,
    resetHistory,
  } = useWorkoutHistory(maxHr)

  useEffect(() => {
    if (workoutStatus === 'running' && currentHR > 0) {
      addDataPoint(currentHR, calories)
    }
  }, [currentHR, calories, workoutStatus, addDataPoint])

  const resetWorkout = () => {
    resetWorkoutSession()
    resetCalories()
    resetHistory()
  }

  return (
    <>
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
        setGender={(g) => setUserSettings((prev) => ({ ...prev, gender: g }))}
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
        maxHr={maxHr}
      />
      {hasStarted && (
        <>
          <RealTimeChart data={history} />
          <ZoneDistributionTable data={zoneDistribution} />
        </>
      )}
    </>
  )
}
