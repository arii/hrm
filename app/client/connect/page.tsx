'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { MeasurementSystem } from '../../../types/core'
import { toKg, toDisplay } from '../../../utils/units'
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator'
import { useHeartRateHistory } from '@/hooks/useHeartRateHistory'
import { useHrZone } from '@/hooks/useHrZone'
import { useHeightInput } from '@/hooks/useHeightInput'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import throttle from 'lodash.throttle'
import { HrmInputMessage } from '@/types/websocket'
import logger from '@/utils/logger'

export default function ConnectPage() {
  const [userSettings, setUserSettings] = useUserSettings()
  const { userName, userAge, userWeight, gender, unitSystem } = userSettings

  const [currentHR, setCurrentHR] = useState(0)

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

  const { connectionStatus, sendData } = useWebSocket()

  // Centralized calorie calculation engine
  const {
    calories,
    processHeartRate,
    reset: resetCalculator,
  } = useCalorieCalculator({
    age: userAge || 30,
    weightKg: userWeight || 70,
  })

  // Throttled sender for WebSocket messages
  const throttledSend = useMemo(
    () =>
      throttle((message: HrmInputMessage) => {
        try {
          sendData(message)
        } catch (error) {
          logger.error({ error, message }, 'Error sending throttled HRM data.')
        }
      }, 250),
    [sendData]
  )

  const {
    workoutDuration,
    resetWorkout: resetWorkoutSession,
    hasStarted,
    startWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected: false, // This will be updated by the useBluetoothHRM hook
    totalCalories: calories,
  })

  // Callback for raw heart rate updates from the Bluetooth hook
  const handleHeartRateUpdate = useCallback(
    (heartRate: number) => {
      logger.info(
        { heartRate },
        'handleHeartRateUpdate called, updating local state'
      )
      setCurrentHR(heartRate)
      if (workoutStatus === 'running') {
        processHeartRate(heartRate)
        addHeartRateSample(heartRate)
      }
    },
    [processHeartRate, workoutStatus, setCurrentHR, addHeartRateSample]
  )
  const {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isDataStale,
    isSupported,
    disconnectionReason,
  } = useBluetoothHRM({
    userName,
    userAge: userAge || 0,
    onHeartRateUpdate: handleHeartRateUpdate,
  })

  useEffect(() => {
    // Try to auto-connect when WebSocket is ready and we're not already connected.
    // Wait a tick to ensure the component is fully initialized before attempting connection.
    if (!isConnected && isSupported && connectionStatus === 'Connected') {
      logger.info('WebSocket ready, attempting auto-connect...')
      // Small delay to ensure component is fully mounted
      const timeout = setTimeout(() => {
        autoConnect().catch(() => {
          logger.info('Auto-connect failed, user can connect manually')
        })
      }, 100)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [connectionStatus, isConnected, isSupported, autoConnect])

  useEffect(() => {
    // This effect synchronizes the local HR and calorie state with the server.
    // It triggers whenever the local `currentHR` or `calories` state changes.
    throttledSend({
      type: 'HRM_INPUT',
      data: {
        value: currentHR,
        calories: calories,
      },
    })
  }, [currentHR, calories, throttledSend])

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
  const maxHr = userAge ? 220 - userAge : 190
  const hrZoneProps = useHrZone(currentHR, maxHr)
  const {
    history: hrHistory,
    zoneDistribution,
    addHeartRateSample,
    resetHistory,
  } = useHeartRateHistory(maxHr)

  const resetWorkout = () => {
    resetWorkoutSession()
    resetCalculator()
    resetHistory()
  }
  return (
    <ConnectView
      duration={formatDuration(workoutDuration)}
      caloriesBurned={calories}
      hrHistory={hrHistory}
      zoneDistribution={zoneDistribution}
      maxHr={maxHr}
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
      isDataStale={isDataStale}
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
