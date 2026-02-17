'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator'
<<<<<<< HEAD
import { calculateMaxHr, calculateZoneFromMaxHr } from '@/lib/shared/hr-zones'
=======
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
>>>>>>> origin/leader
import throttle from 'lodash.throttle'
import { HrmInputMessage } from '@/types/websocket'
import logger from '@/utils/logger'
import {
  ConnectSettingsProvider,
  useConnectSettingsContext,
} from './context/ConnectSettingsContext'

function ConnectPageContent() {
  const { userName, userAge, userWeight } = useConnectSettingsContext()

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

<<<<<<< HEAD
  const maxHr = calculateMaxHr(userAge)
  const { percentage, zone } = calculateZoneFromMaxHr(currentHR, maxHr)
=======
  const { zone, percentage } = calculateZoneFromMaxHr(
    currentHR,
    calculateMaxHr(userAge)
  )
  const heartRateZone = toHeartRateZone(zone)
>>>>>>> origin/leader

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

  const handleConnect = () => {
    connectAndStream(userName, userAge || 0)
  }

  // Signal when page is ready for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = window.setTimeout(() => {
        window.__TEST_READY__ = true
        window.dispatchEvent(new CustomEvent('test-ready'))
      }, 500)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [])

  return (
    <ConnectView
      duration={formatDuration(workoutDuration, {
        unit: 'seconds',
        format: 'HH:MM:SS',
      })}
      caloriesBurned={caloriesBurned}
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
      session={session}
    />
  )
}

export default function ConnectPage() {
  return (
    <ConnectSettingsProvider>
      <ConnectPageContent />
    </ConnectSettingsProvider>
  )
}
