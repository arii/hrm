'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { MeasurementSystem } from '../../../types/core'
import { toKg, toDisplay } from '../../../utils/units'
<<<<<<< HEAD
import { useCalorieTracker } from '@/hooks/useCalorieTracker'
import {
  calculateZoneFromMaxHr,
  calculateMaxHr,
  toHeartRateZone,
} from '@/lib/shared/hr-zones'
=======
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator'
import { calculateZoneFromMaxHr, toHeartRateZone } from '@/lib/shared/hr-zones'
import { calculateMaxHr } from '@/utils/hrCalculations'
>>>>>>> origin/leader
import { useHeightInput } from '@/hooks/useHeightInput'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import throttle from 'lodash.throttle'
import { HrmInputMessage } from '@/types/websocket'
import logger from '@/utils/logger'
import { useTestPageReady } from '@/hooks/useTestPageReady'

export default function ConnectPage() {
  const [userSettings, setUserSettings] = useUserSettings()
  const { userName, userAge, userWeight, gender, unitSystem } = userSettings

  const [currentHR, setCurrentHR] = useState(0)
  const isReady = useTestPageReady()

  const [localDisplayWeight, setLocalDisplayWeight] = useState<string | null>(
    null
  )

  const displayWeight = useMemo(() => {
    if (localDisplayWeight !== null) {
      return localDisplayWeight
    }
    if (userWeight) {
      return toDisplay(userWeight, unitSystem).toString()
    }
    return ''
  }, [localDisplayWeight, userWeight, unitSystem])

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
    setLocalDisplayWeight(newDisplayValue)
  }

  const handleWeightBlur = () => {
    const valueToValidate = localDisplayWeight ?? displayWeight
    const error = validateWeightValue(valueToValidate, unitSystem)
    setWeightError(error)

    if (!error) {
      const numericValue = parseFloat(valueToValidate)
      if (!isNaN(numericValue) && numericValue > 0) {
        const newKgValue = toKg(numericValue, unitSystem)
        setUserSettings((prev) => ({ ...prev, userWeight: newKgValue }))
      }
    }
    // Reset local state to show the canonical value from context
    setLocalDisplayWeight(null)
  }

  const { connectionStatus, sendData } = useWebSocket()

  useEffect(() => {
    if (connectionStatus === 'Connected') {
      sendData({
        type: 'HRM_METADATA_UPDATE',
        data: {
          name: userName || 'User',
          age: userAge || 30,
        },
      })
    }
  }, [connectionStatus, userName, userAge, sendData])

  const {
    totalCaloriesBurned: calories,
    processHeartRate,
    reset: resetCalculator,
    setCalories: setTrackerCalories,
  } = useCalorieTracker({
    age: userAge || 30,
    weightKg: userWeight || 70,
  })

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
    session,
    workoutDuration,
    workoutStatus,
    isInitialized,
    hasStarted,
    caloriesBurned,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    resetWorkout,
    addHrData,
    updateCalories,
  } = useWorkoutSessionManager()

  const handleStartWorkout = useCallback(() => {
    if (workoutStatus === 'idle') {
      startWorkout(userAge || 30, userWeight || 70)
    } else if (workoutStatus === 'paused') {
      resumeWorkout()
    }
  }, [startWorkout, resumeWorkout, workoutStatus, userAge, userWeight])

  useEffect(() => {
    if (isInitialized) {
      updateCalories(calories)
    }
  }, [calories, updateCalories, isInitialized])

  // Sync recovered calories to tracker on initialization
  useEffect(() => {
    if (
      isInitialized &&
      hasStarted &&
      workoutStatus !== 'finished' &&
      session?.totalCaloriesBurned
    ) {
      setTrackerCalories(session.totalCaloriesBurned)
    }
    // Only run once when initialized to avoid feedback loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized])

  const handleEndWorkout = useCallback(() => {
    endWorkout()
    resetCalculator() // Reset calories on workout end
  }, [endWorkout, resetCalculator])

  const handleResetWorkout = useCallback(() => {
    resetWorkout()
    resetCalculator()
  }, [resetWorkout, resetCalculator])

  const handleHeartRateUpdate = useCallback(
    (heartRate: number) => {
      logger.debug(
        { heartRate },
        'handleHeartRateUpdate called, updating local state'
      )
      setCurrentHR(heartRate)

      if (workoutStatus === 'running') {
        processHeartRate(heartRate)

        addHrData({
          time: Date.now(),
          hr: heartRate,
        })
      }
    },
    [processHeartRate, workoutStatus, setCurrentHR, addHrData]
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
    signalPeriodMs,
    connectionAttempted,
  } = useBluetoothHRM({
    userName,
    userAge: userAge || 0,
    onHeartRateUpdate: handleHeartRateUpdate,
    onConnect: handleStartWorkout,
  })

  // Automatically start workout or resume when connected to maintain previous behavior
  useEffect(() => {
    if (isInitialized && isConnected) {
      if (workoutStatus === 'idle') {
        startWorkout(userAge || 30, userWeight || 70)
      } else if (workoutStatus === 'paused') {
        resumeWorkout()
      }
    }
  }, [
    isInitialized,
    isConnected,
    workoutStatus,
    startWorkout,
    resumeWorkout,
    userAge,
    userWeight,
  ])

  useEffect(() => {
    if (
      !isConnected &&
      isSupported &&
      connectionStatus === 'Connected' &&
      !connectionAttempted
    ) {
      logger.info('WebSocket ready, attempting auto-connect...')
      const timeout = setTimeout(() => {
        autoConnect().catch(() => {
          logger.info('Auto-connect failed, user can connect manually')
        })
      }, 100)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [
    connectionStatus,
    isConnected,
    isSupported,
    autoConnect,
    connectionAttempted,
  ])

  const { zone, percentage } = calculateZoneFromMaxHr(
    currentHR,
    calculateMaxHr(userAge)
  )
  const heartRateZone = toHeartRateZone(zone)

  useEffect(() => {
    throttledSend({
      type: 'HRM_INPUT',
      data: {
        value: currentHR,
        calories: calories,
        percentage,
        zone: heartRateZone,
      },
    })
  }, [currentHR, calories, percentage, heartRateZone, throttledSend])

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
      setLocalDisplayWeight(null)
    }
  }

  const handleConnect = () => {
    connectAndStream(userName, userAge || 0)
  }

  return (
    <ConnectView
      isReady={isReady}
      duration={formatDuration(workoutDuration, {
        unit: 'seconds',
        format: 'HH:MM:SS',
      })}
      caloriesBurned={caloriesBurned || calories}
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
      userWeight={displayWeight || ''}
      setUserWeight={handleWeightChange}
      onWeightBlur={handleWeightBlur}
      weightError={weightError}
      gender={gender}
      setGender={(g) => setUserSettings((prev) => ({ ...prev, gender: g }))}
      unitSystem={unitSystem}
      onUnitChange={handleUnitChange}
      isConnected={isConnected}
      isDataStale={isDataStale}
      deviceStatus={deviceStatus}
      batteryLevel={batteryLevel}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      onForgetDevice={forgetDevice}
      isSupported={isSupported}
      signalPeriodMs={signalPeriodMs}
      currentHR={currentHR}
      hrZoneProps={{
        percentage,
      }}
      zone={heartRateZone}
      connectionStatus={connectionStatus}
      bluetoothConnected={isConnected}
      hasStarted={hasStarted}
      onReset={handleResetWorkout}
      workoutStatus={workoutStatus}
      onStartWorkout={handleStartWorkout}
      onPauseWorkout={pauseWorkout}
      onEndWorkout={handleEndWorkout}
    />
  )
}
