'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { useSession } from 'next-auth/react'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { MeasurementSystem } from '../../../types/core'
import { toKg, toDisplay } from '../../../utils/units'
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator'
import {
  calculateZoneFromMaxHr,
  calculateMaxHr,
  toHeartRateZone,
} from '@/lib/shared/hr-zones'
import { useHeightInput } from '@/hooks/useHeightInput'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import throttle from 'lodash.throttle'
import { HrmInputMessage } from '@/types/websocket'
import logger from '@/utils/logger'
import { downloadBlob } from '@/utils/download'
import { generateFIT } from '@/services/exportService'

const DEFAULT_USER_AGE = 30
const DEFAULT_USER_WEIGHT_KG = 70

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

  useEffect(() => {
    if (connectionStatus === 'Connected') {
      sendData({
        type: 'HRM_METADATA_UPDATE',
        data: {
          name: userName || 'User',
          age: userAge || DEFAULT_USER_AGE,
        },
      })
    }
  }, [connectionStatus, userName, userAge, sendData])

  const {
    calories,
    processHeartRate,
    reset: resetCalculator,
  } = useCalorieCalculator({
    age: userAge || DEFAULT_USER_AGE,
    weightKg: userWeight || DEFAULT_USER_WEIGHT_KG,
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
    session: persistentSession,
    status: persistentStatus,
    addHrData,
    startWorkout: startPersistentWorkout,
    endWorkout: endPersistentWorkout,
    resetWorkout: resetPersistentWorkout,
  } = useWorkoutSessionManager()

  const [isHrmConnected, setIsHrmConnected] = useState(false)

  const {
    workoutDuration,
    caloriesBurned: preservedCalories,
    resetWorkout: resetWorkoutSession,
    startWorkout,
    pauseWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected: isHrmConnected,
    totalCalories: calories,
  })

  const { data: authSession } = useSession()
  const { showSuccess, showError } = useAppSnackbar()
  const [isExporting, setIsExporting] = useState(false)

  const handleExportWorkout = useCallback(async () => {
    if (!persistentSession) return

    if (!authSession) {
      showError('Please log in to export your workout.')
      return
    }

    setIsExporting(true)
    try {
      const blob = generateFIT(persistentSession)
      downloadBlob(blob, `workout_${persistentSession.sessionId}.fit`)
      showSuccess('Workout successfully exported to FIT file!')
    } catch (error) {
      logger.error({ error }, 'Export failed')
      showError('An error occurred while exporting.')
    } finally {
      setIsExporting(false)
    }
  }, [persistentSession, authSession, showSuccess, showError])

  const handleStartWorkout = useCallback(() => {
    startWorkout()
    // Default to 30 age and 70kg weight if missing to ensure session starts
    // This matches useCalorieCalculator defaults and prevents silent failure
    startPersistentWorkout(
      userAge || DEFAULT_USER_AGE,
      userWeight || DEFAULT_USER_WEIGHT_KG
    )
  }, [startWorkout, startPersistentWorkout, userAge, userWeight])

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
    onConnect: () => {
      setIsHrmConnected(true)
      handleStartWorkout()
    },
  })

  // Synchronize HrmConnected state when it changes in the hook (e.g. on disconnect)
  useEffect(() => {
    setIsHrmConnected(isConnected)
  }, [isConnected])

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

  // Derive specialized status for ConnectView to simplify its conditional rendering logic.
  const displayWorkoutControlsStatus = (() => {
    if (persistentStatus === 'finished') return 'idle'
    if (persistentStatus !== 'idle') return persistentStatus
    return workoutStatus
  })()

  const isWorkoutSessionActive =
    !!persistentSession || persistentStatus === 'finished'

  return (
    <ConnectView
      duration={formatDuration(workoutDuration, {
        unit: 'seconds',
        format: 'HH:MM:SS',
      })}
      caloriesBurned={
        persistentSession
          ? persistentSession.totalCaloriesBurned
          : preservedCalories
      }
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
      hasStarted={isWorkoutSessionActive}
      onReset={handleResetWorkout}
      workoutStatus={displayWorkoutControlsStatus}
      onStartWorkout={handleStartWorkout}
      onExportWorkout={handleExportWorkout}
      isExporting={isExporting}
      sessionId={persistentSession?.sessionId}
      onPauseWorkout={pauseWorkout}
      onEndWorkout={handleEndWorkout}
    />
  )
}
