'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocketConnection } from '@/context/WebSocketContext'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { useWakeLock } from '@/hooks/useWakeLock'
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
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { SLOW_PACKET_WARNING_THRESHOLD } from '@/constants/bluetooth'

export default function ConnectPage() {
  const userProfile = useConnectUserProfile()
  const {
    userName,
    userAgeNum: userAge,
    userWeightKg: userWeight,
    gender,
  } = userProfile.data

  // null until the first packet, so the tile shows '---' instead of a
  // fake 0 BPM / Idle reading.
  const [currentHR, setCurrentHR] = useState<number | null>(null)

  const { connectionStatus, sendData } = useWebSocketConnection()

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

  // Keep the OS from throttling the page (and its GATT stream) while a
  // workout runs. Paused/idle holds no lock: no battery drain for dead air.
  useWakeLock(workoutStatus === 'running')

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

  const { showWarning } = useAppSnackbar()

  const {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
    signalPeriodMs,
    lastPeriodMs,
    consecutiveSlowPackets,
    connectionAttempted,
    showReloadFallback,
  } = useBluetoothHRM({
    userName,
    userAge: userAge || 0,
    onHeartRateUpdate: handleHeartRateUpdate,
    onConnect: handleStartWorkout,
  })

  // A paused session resumes once per connection, so a Pause tapped while
  // the strap stays connected sticks until the next (re)connect.
  const resumedThisConnectionRef = useRef(false)

  useEffect(() => {
    if (!isConnected) {
      resumedThisConnectionRef.current = false
      return
    }
    if (!isInitialized) return
    if (workoutStatus === 'idle') {
      startWorkout(userAge || 30, userWeight || 70, { gender })
    } else if (
      workoutStatus === 'paused' &&
      !resumedThisConnectionRef.current
    ) {
      resumeWorkout()
    }
    resumedThisConnectionRef.current = true
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
        autoConnect().catch((error: unknown) => {
          logger.info(
            { error },
            'Auto-connect failed, user can connect manually'
          )
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
    currentHR ?? 0,
    calculateMaxHr(userAge)
  )
  const heartRateZone = toHeartRateZone(zone)

  useEffect(() => {
    throttledSend({
      type: 'HRM_INPUT',
      data: {
        value: currentHR ?? 0,
        calories: caloriesBurned,
        percentage,
        zone: heartRateZone,
      },
    })
  }, [currentHR, caloriesBurned, percentage, heartRateZone, throttledSend])

  useEffect(() => {
    if (consecutiveSlowPackets === SLOW_PACKET_WARNING_THRESHOLD)
      showWarning('HRM Signal Weak: Check device placement')
  }, [consecutiveSlowPackets, showWarning])

  const handleConnect = () => {
    // The failure is already surfaced via handleConnectionError; catch here
    // only to avoid an unhandled promise rejection.
    connectAndStream(userName, userAge || 0).catch(() => {})
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
      deviceStatus={deviceStatus}
      batteryLevel={batteryLevel}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      onForgetDevice={forgetDevice}
      showReloadFallback={showReloadFallback}
      isSupported={isSupported}
      signalPeriodMs={signalPeriodMs}
      lastPeriodMs={lastPeriodMs}
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
