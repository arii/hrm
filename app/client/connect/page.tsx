'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { MeasurementSystem } from '../../../types/core'
import { toKg, toDisplay } from '../../../utils/units'
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator'
import { useHrZone } from '@/hooks/useHrZone'
import { calculateMaxHr, calculateHrZoneInfo } from '@/lib/shared/hr-zones'
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
  // Always send metadata even if userName is empty, to ensure HRM data appears on dashboard
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      sendData({
        type: 'HRM_METADATA_UPDATE',
        data: {
          name: userName || 'User', // Use default name if not set
          age: userAge || 30,
        },
      })
    }
  }, [connectionStatus, userName, userAge, sendData])

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
    pauseWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected: false, // This will be updated by the useBluetoothHRM hook
    totalCalories: calories,
  })

  // Add the workout session manager for data persistence
  const {
    addHrData,
    startWorkout: startPersistentWorkout,
    endWorkout: endPersistentWorkout,
    resetWorkout: resetPersistentWorkout,
  } = useWorkoutSessionManager()

  // Create wrapper functions that sync both hooks
  const handleStartWorkout = useCallback(() => {
    startWorkout()
    if (userAge && userWeight) {
      startPersistentWorkout(userAge, userWeight)
    }
  }, [startWorkout, startPersistentWorkout, userAge, userWeight])

  const handleEndWorkout = useCallback(() => {
    endWorkout()
    endPersistentWorkout()
  }, [endWorkout, endPersistentWorkout])

  const handleResetWorkout = useCallback(() => {
    resetWorkoutSession()
    resetCalculator()
    resetPersistentWorkout()
  }, [resetWorkoutSession, resetCalculator, resetPersistentWorkout])

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

        // CRITICAL: Persist HR data to IndexedDB
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

  const { percentage, zone } = useMemo(
    () => calculateHrZoneInfo(currentHR, userAge || 30),
    [currentHR, userAge]
  )

  useEffect(() => {
    // This effect synchronizes the local HR and calorie state with the server.
    // It triggers whenever the local `currentHR` or `calories` state changes.
    throttledSend({
      type: 'HRM_INPUT',
      data: {
        value: currentHR,
        calories: calories,
        percentage,
        zone,
      },
    })
  }, [currentHR, calories, percentage, zone, throttledSend])

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
      // When the unit changes, the displayed weight needs to be re-calculated.
      // Resetting localDisplayWeight will cause the useMemo to re-calculate
      // based on the new unit system.
      setLocalDisplayWeight(null)
    }
  }

  const handleConnect = () => {
    connectAndStream(userName, userAge || 0)
  }
  const maxHr = calculateMaxHr(userAge)
  const hrZoneProps = useHrZone(currentHR, maxHr)

  return (
    <ConnectView
      duration={formatDuration(workoutDuration, {
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
      hasStarted={hasStarted}
      onReset={handleResetWorkout}
      workoutStatus={workoutStatus}
      onStartWorkout={handleStartWorkout}
      onPauseWorkout={pauseWorkout}
      onEndWorkout={handleEndWorkout}
    />
  )
}
