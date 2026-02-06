'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { MeasurementSystem } from '../../../types/core'
import { toKg, toDisplay } from '../../../utils/units'
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator'
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

  // Send user metadata when WebSocket connects
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

  // Unified Session Manager
  const {
    duration,
    status: workoutStatus,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    resetWorkout,
    addHrData,
    updateCalories,
  } = useWorkoutSessionManager()

  // Centralized calorie calculation engine
  const {
    calories,
    processHeartRate,
    reset: resetCalculator,
  } = useCalorieCalculator({
    age: userAge || 30,
    weightKg: userWeight || 70,
    onCaloriesUpdate: (newCalories) => {
      if (workoutStatus !== 'idle' && workoutStatus !== 'finished') {
        updateCalories(newCalories)
      }
    },
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

  const handleStartWorkout = useCallback(() => {
    if (workoutStatus === 'idle' || workoutStatus === 'finished') {
      startWorkout(userAge || 30, userWeight || 70)
    } else if (workoutStatus === 'paused') {
      resumeWorkout()
    }
  }, [workoutStatus, startWorkout, resumeWorkout, userAge, userWeight])

  const handleResetWorkout = useCallback(() => {
    resetCalculator()
    resetWorkout()
  }, [resetCalculator, resetWorkout])

  const handleEndWorkout = useCallback(() => {
    endWorkout()
  }, [endWorkout])

  // Callback for raw heart rate updates from the Bluetooth hook
  const handleHeartRateUpdate = useCallback(
    (heartRate: number) => {
      logger.debug(
        { heartRate },
        'handleHeartRateUpdate called, updating local state'
      )
      setCurrentHR(heartRate)

      // Process for calorie calculation
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
  } = useBluetoothHRM({
    userName,
    userAge: userAge || 0,
    onHeartRateUpdate: handleHeartRateUpdate,
    onConnect: handleStartWorkout, // Use the wrapped function
  })

  // Handle auto-pause/resume on connection change
  const prevIsConnected = useRef(isConnected)
  useEffect(() => {
    if (prevIsConnected.current !== isConnected) {
      if (!isConnected && workoutStatus === 'running') {
        pauseWorkout()
      } else if (isConnected && workoutStatus === 'paused') {
        resumeWorkout()
      }
      prevIsConnected.current = isConnected
    }
  }, [isConnected, workoutStatus, pauseWorkout, resumeWorkout])

  useEffect(() => {
    if (!isConnected && isSupported && connectionStatus === 'Connected') {
      logger.info('WebSocket ready, attempting auto-connect...')
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
    throttledSend({
      type: 'HRM_INPUT',
      data: {
        value: currentHR,
        calories: calories,
      },
    })
  }, [currentHR, calories, throttledSend])

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
      setLocalDisplayWeight(null)
    }
  }

  const handleConnect = () => {
    connectAndStream(userName, userAge || 0)
  }
  const maxHr = userAge ? 220 - userAge : 190
  const hrZoneProps = useHrZone(currentHR, maxHr)

  return (
    <ConnectView
      duration={formatDuration(duration, {
        unit: 'seconds',
        format: 'HH:MM:SS',
      })}
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
        percentage: hrZoneProps.percentage,
        progressColor: hrZoneProps.progressColor,
      }}
      connectionStatus={connectionStatus}
      bluetoothConnected={isConnected}
      hasStarted={workoutStatus !== 'idle'}
      onReset={handleResetWorkout}
      workoutStatus={workoutStatus === 'finished' ? 'idle' : workoutStatus}
      onStartWorkout={handleStartWorkout}
      onPauseWorkout={pauseWorkout}
      onEndWorkout={handleEndWorkout}
    />
  )
}
