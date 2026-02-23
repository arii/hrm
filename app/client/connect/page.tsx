'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import {
  calculateZoneFromMaxHr,
  calculateMaxHr,
  toHeartRateZone,
} from '@/lib/shared/hr-zones'
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer'
import { useConnectUserProfile } from '@/hooks/useConnectUserProfile'
import throttle from 'lodash.throttle'
import { HrmInputMessage } from '@/types/websocket'
import logger from '@/utils/logger'

export default function ConnectPage() {
  const userProfile = useConnectUserProfile()
  const {
    userName,
    userAgeNum: userAge,
    userWeightKg: userWeight,
    gender,
  } = userProfile.data

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
  } = useWorkoutSessionManager()

  const workoutDuration = useWorkoutTimer(
    workoutStatus,
    session?.startTime,
    session?.totalPaused,
    session?.pauseTime,
    session?.endTime
  )

  const handleStartWorkout = useCallback(() => {
    if (workoutStatus === 'idle') {
      startWorkout(userAge || 30, userWeight || 70, { gender })
    } else if (workoutStatus === 'paused') {
      resumeWorkout()
    }
  }, [startWorkout, resumeWorkout, workoutStatus, userAge, userWeight, gender])

  const handleEndWorkout = useCallback(() => {
    endWorkout()
  }, [endWorkout])

  const handleResetWorkout = useCallback(() => {
    resetWorkout()
  }, [resetWorkout])

  const handleHeartRateUpdate = useCallback(
    (heartRate: number) => {
      logger.debug(
        { heartRate },
        'handleHeartRateUpdate called, updating local state'
      )
      setCurrentHR(heartRate)

      if (workoutStatus === 'running') {
        addHrData(heartRate)
      }
    },
    [workoutStatus, setCurrentHR, addHrData]
  )

  const {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    bluetoothStatus,
    isDataStale,
    isSupported,
    signalPeriodMs,
    connectionAttempted,
  } = useBluetoothHRM({
    userName,
    userAge: userAge || 0,
    onHeartRateUpdate: handleHeartRateUpdate,
    onConnect: handleStartWorkout,
    isWorkoutActive: hasStarted,
  })

  // Automatically start workout or resume when connected to maintain previous behavior
  useEffect(() => {
    if (isInitialized && isConnected) {
      if (workoutStatus === 'idle') {
        startWorkout(userAge || 30, userWeight || 70, { gender })
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
    gender,
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
        calories: caloriesBurned,
        percentage,
        zone: heartRateZone,
      },
    })
  }, [currentHR, caloriesBurned, percentage, heartRateZone, throttledSend])

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
      userProfile={userProfile}
      isConnected={isConnected}
      bluetoothStatus={bluetoothStatus}
      isDataStale={isDataStale}
      deviceStatus={deviceStatus}
      batteryLevel={batteryLevel}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      onForgetDevice={forgetDevice}
      isSupported={isSupported}
      signalPeriodMs={signalPeriodMs}
      currentHR={currentHR}
      hrZoneData={{
        percentage,
        zone: heartRateZone,
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
