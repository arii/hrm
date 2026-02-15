'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { calculateHrZoneInfo } from '@/lib/shared/hr-zones'
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
  const {
    userName,
    userAge,
    userWeight,
    gender,
    unitSystem,
    hrZoneMethod,
    maxHrOverride,
    restingHr,
    customZoneThresholds,
  } = userSettings

  const [currentHR, setCurrentHR] = useState(0)

  const [localMaxHrOverride, setLocalMaxHrOverride] = useState<string>(
    maxHrOverride?.toString() || ''
  )
  const [maxHrError, setMaxHrError] = useState<string | null>(null)

  const [localRestingHr, setLocalRestingHr] = useState<string>(
    restingHr?.toString() || ''
  )
  const [restingHrError, setRestingHrError] = useState<string | null>(null)

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
    calories,
    processHeartRate,
    reset: resetCalculator,
  } = useCalorieCalculator({
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

  // Use refs to break the circular dependency between useWorkoutSession and useBluetoothHRM
  const workoutStatusRef = useRef<'idle' | 'running' | 'paused'>('idle')
  const startWorkoutRef = useRef<() => void>(() => {})

  const {
    session,
    addHrData,
    startWorkout: startPersistentWorkout,
    endWorkout: endPersistentWorkout,
    resetWorkout: resetPersistentWorkout,
  } = useWorkoutSessionManager()

  const handleStartWorkout = useCallback(() => {
    startWorkoutRef.current()
    if (userAge && userWeight) {
      startPersistentWorkout(userAge, userWeight)
    }
  }, [startPersistentWorkout, userAge, userWeight])

  const handleHeartRateUpdate = useCallback(
    (heartRate: number) => {
      logger.debug(
        { heartRate },
        'handleHeartRateUpdate called, updating local state'
      )
      setCurrentHR(heartRate)

      if (workoutStatusRef.current === 'running') {
        processHeartRate(heartRate)

        addHrData({
          time: Date.now(),
          hr: heartRate,
          calories: calories,
        })
      }
    },
    [processHeartRate, setCurrentHR, addHrData, calories]
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

  const {
    workoutDuration,
    resetWorkout: resetWorkoutSession,
    hasStarted,
    startWorkout,
    pauseWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected,
    totalCalories: calories,
  })

  // Update refs when workout status or start function changes
  useEffect(() => {
    workoutStatusRef.current = workoutStatus
    startWorkoutRef.current = startWorkout
  }, [workoutStatus, startWorkout])

  const handleEndWorkout = useCallback(() => {
    endWorkout()
    endPersistentWorkout()
    resetCalculator() // Reset calories on workout end
  }, [endWorkout, endPersistentWorkout, resetCalculator])

  const handleResetWorkout = useCallback(() => {
    resetWorkoutSession()
    resetCalculator()
    resetPersistentWorkout()
  }, [resetWorkoutSession, resetCalculator, resetPersistentWorkout])

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

  useEffect(() => {
    if (!localMaxHrOverride) {
      setMaxHrError(null)
      if (maxHrOverride !== null) {
        setUserSettings((prev) => ({ ...prev, maxHrOverride: null }))
      }
      return
    }

    const val = parseInt(localMaxHrOverride, 10)
    if (isNaN(val) || val <= 0) {
      setMaxHrError('Please enter a valid maximum heart rate')
    } else if (val > 250) {
      setMaxHrError('Maximum heart rate seems too high (> 250)')
    } else {
      setMaxHrError(null)
      if (val !== maxHrOverride) {
        setUserSettings((prev) => ({ ...prev, maxHrOverride: val }))
      }
    }
  }, [localMaxHrOverride, maxHrOverride, setUserSettings])

  useEffect(() => {
    if (!localRestingHr) {
      setRestingHrError(null)
      if (restingHr !== null) {
        setUserSettings((prev) => ({ ...prev, restingHr: null }))
      }
      return
    }

    const val = parseInt(localRestingHr, 10)
    if (isNaN(val) || val <= 0) {
      setRestingHrError('Please enter a valid resting heart rate')
    } else if (val > 150) {
      setRestingHrError('Resting heart rate seems too high (> 150)')
    } else {
      setRestingHrError(null)
      if (val !== restingHr) {
        setUserSettings((prev) => ({ ...prev, restingHr: val }))
      }
    }
  }, [localRestingHr, restingHr, setUserSettings])

  const { percentage, zone } = calculateHrZoneInfo(currentHR, {
    method: hrZoneMethod,
    age: userAge,
    maxHrOverride: maxHrOverride,
    restingHr: restingHr,
    thresholds: customZoneThresholds,
  })

  useEffect(() => {
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
      setLocalDisplayWeight(null)
    }
  }

  const handleConnect = () => {
    connectAndStream(userName, userAge || 0)
  }

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
        percentage,
      }}
      zone={zone}
      connectionStatus={connectionStatus}
      bluetoothConnected={isConnected}
      hasStarted={hasStarted}
      onReset={handleResetWorkout}
      workoutStatus={workoutStatus}
      onStartWorkout={handleStartWorkout}
      onPauseWorkout={pauseWorkout}
      onEndWorkout={handleEndWorkout}
      hrZoneMethod={hrZoneMethod}
      setHrZoneMethod={(method) =>
        setUserSettings((prev) => ({ ...prev, hrZoneMethod: method }))
      }
      maxHrOverride={localMaxHrOverride}
      setMaxHrOverride={setLocalMaxHrOverride}
      maxHrError={maxHrError}
      restingHr={localRestingHr}
      setRestingHr={setLocalRestingHr}
      restingHrError={restingHrError}
      customZoneThresholds={customZoneThresholds}
      setCustomZoneThresholds={(thresholds) =>
        setUserSettings((prev) => ({
          ...prev,
          customZoneThresholds: thresholds,
        }))
      }
      session={session}
    />
  )
}
