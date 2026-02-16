'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator'
import { calculateHrZoneInfo } from '@/lib/shared/hr-zones'
import throttle from 'lodash.throttle'
import { HrmInputMessage } from '@/types/websocket'
import logger from '@/utils/logger'
import { useConnectSettings } from './hooks/useConnectSettings'

export default function ConnectPage() {
  const {
    setUserSettings,
    userName,
    userAge,
    userWeight,
    gender,
    unitSystem,
    hrZoneMethod,
    maxHrOverride,
    restingHr,
    customZoneThresholds,
    localMaxHrOverride,
    setLocalMaxHrOverride,
    maxHrError,
    localRestingHr,
    setLocalRestingHr,
    restingHrError,
    displayWeight,
    handleWeightChange,
    handleWeightBlur,
    weightError,
    ageError,
    handleAgeBlur,
    displayHeight,
    handleHeightChange,
    handleHeightBlur,
    heightError,
    handleUnitChange,
    handleThresholdChange,
  } = useConnectSettings()

  const [currentHR, setCurrentHR] = useState(0)

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

  const {
    session,
    addHrData,
    startWorkout: startPersistentWorkout,
    endWorkout: endPersistentWorkout,
    resetWorkout: resetPersistentWorkout,
  } = useWorkoutSessionManager()

  const {
    workoutDuration,
    resetWorkout: resetWorkoutSession,
    hasStarted,
    startWorkout,
    pauseWorkout,
    endWorkout,
    workoutStatus,
    caloriesBurned,
  } = useWorkoutSession({
    totalCalories: calories,
  })

  const handleStartWorkout = useCallback(() => {
    startWorkout()
    if (userAge && userWeight) {
      startPersistentWorkout(userAge, userWeight)
    }
  }, [startWorkout, startPersistentWorkout, userAge, userWeight])

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
          calories: caloriesBurned,
        })
      }
    },
    [processHeartRate, setCurrentHR, addHrData, workoutStatus, caloriesBurned]
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

  // Auto-pause/resume workout based on connection status
  useEffect(() => {
    if (hasStarted) {
      if (isConnected && workoutStatus === 'paused') {
        startWorkout()
      } else if (!isConnected && workoutStatus === 'running') {
        pauseWorkout()
      }
    }
  }, [isConnected, hasStarted, workoutStatus, startWorkout, pauseWorkout])

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

  const handleConnect = () => {
    connectAndStream(userName, userAge || 0)
  }

  return (
    <ConnectView
      duration={formatDuration(workoutDuration, {
        unit: 'seconds',
        format: 'HH:MM:SS',
      })}
      caloriesBurned={caloriesBurned}
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
      handleThresholdChange={handleThresholdChange}
      session={session}
    />
  )
}
