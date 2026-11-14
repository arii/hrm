import { useCallback, useEffect, useRef, useState } from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import logger from '@/utils/logger'
import { useWebSocketConnection } from '@/context/WebSocketContext'
import { useHrmMetadataSync } from '@/hooks/useHrmMetadataSync'
import { clientEnv } from '@/lib/env-client'
import Cookies from 'js-cookie'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import { DATA_LIVENESS_TIMEOUT_MS } from '@/constants/bluetooth'
import {
  HEARTBEAT_INTERVAL_MS,
  statusMessageMap,
} from './useBluetoothHRM/constants'
import { getAutoConnectFailureMessage } from './useBluetoothHRM/gattClassification'
import {
  resolveConnectDevice,
  findSavedDevice as findSavedDeviceImpl,
} from './useBluetoothHRM/deviceScan'
import {
  teardownTestControls,
  type HrmTestControls,
} from './useBluetoothHRM/testControls'
import { useConnectionOwnership } from './useBluetoothHRM/useConnectionOwnership'
import { useHrSignalStats } from './useBluetoothHRM/useHrSignalStats'
import { useHrmRecovery } from './useBluetoothHRM/useHrmRecovery'
import { useGattConnect } from './useBluetoothHRM/useGattConnect'

// Public API surface (tests and the connect page import from here); the
// implementations live in the focused modules under useBluetoothHRM/.
export { HEARTBEAT_INTERVAL_MS } from './useBluetoothHRM/constants'
export {
  classifyGattConnectError,
  classifyGattFailure,
  getAutoConnectFailureMessage,
  isBusyRadioError,
  isQuietStrapMiss,
} from './useBluetoothHRM/gattClassification'
export { resolveConnectDevice } from './useBluetoothHRM/deviceScan'
export { setupBatteryNotifications } from './useBluetoothHRM/batteryNotifications'
export { teardownTestControls } from './useBluetoothHRM/testControls'
export type { GattConnectRetryState } from './useBluetoothHRM/gattClassification'
export type { ConnectDeviceResolver } from './useBluetoothHRM/deviceScan'
export type { HrmTestControls } from './useBluetoothHRM/testControls'

interface UseBluetoothHRMProps {
  dataLivenessTimeoutMs?: number
  throttleMs?: number
  userName?: string | null
  userAge?: number | null
  onHeartRateUpdate?: (heartRate: number) => void
  onConnect?: () => void
  heartbeatInterval?: number
}

/**
 * Bluetooth HRM connection hook: scans, connects, streams heart rate, and
 * drives reconnection. This module is the orchestrator — connection state,
 * the manual/auto connect flows, and cleanup; the mechanics live in
 * focused slices:
 *
 * - useConnectionOwnership: ownership token + radio guard flags
 * - useHrSignalStats: measurement parsing + signal statistics
 * - useHrmRecovery: reconnect backoff + waiting-for-device fallback
 * - useGattConnect: the GATT connect retry loop + failure handling
 * - deviceScan/gattClassification/batteryNotifications: pure helpers
 */
const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const {
    dataLivenessTimeoutMs = DATA_LIVENESS_TIMEOUT_MS,
    userName,
    userAge,
    onHeartRateUpdate,
    onConnect,
    heartbeatInterval = HEARTBEAT_INTERVAL_MS,
  } = props
  const { sendData, connectionStatus } = useWebSocketConnection()
  const [status, setStatus] = useState<BluetoothConnectionStatus>(
    BluetoothConnectionStatus.DISCONNECTED
  )
  const [customStatusMessage, setCustomStatusMessage] = useState<string | null>(
    null
  )
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const deviceStatus = customStatusMessage ?? statusMessageMap[status]

  const currentStatusRef = useRef(status)
  const connectedDeviceRef = useRef<BluetoothDevice | null>(null)
  const connectToGattRef = useRef<
    | ((
        device: BluetoothDevice,
        isReconnect?: boolean,
        retryQuietStrap?: boolean
      ) => Promise<boolean>)
    | null
  >(null)
  // Set when a GATT timeout stops the auto-reconnect loop: a timeout means
  // an asleep strap or slow adapter, not a dead link, so retries halt but
  // the saved device and cookie are kept for a one-touch retry (unlike
  // attempts exhaustion, which forgets the device). Consumed by
  // reconnect(); cleared on every fresh episode (see onDisconnected),
  // manual disconnect, and successful connect.
  const reconnectHaltedRef = useRef(false)
  const onConnectRef = useRef(onConnect)

  useEffect(() => {
    onConnectRef.current = onConnect
  }, [onConnect])

  const sendDataRef = useRef(sendData)
  useEffect(() => {
    sendDataRef.current = sendData
  }, [sendData])

  // Stable device-name reader for metadata sync (ref reads need no dep).
  const getDeviceName = useCallback(
    () => connectedDeviceRef.current?.name || 'Unknown',
    []
  )

  // User-details sync lives in its own hook; lifecycle + signal protocol stay
  // here (see useHrmMetadataSync for the decomposition rationale).
  const { userDetailsRef } = useHrmMetadataSync({
    userName,
    userAge,
    status,
    getDeviceName,
    sendData,
  })

  useEffect(() => {
    currentStatusRef.current = status
  }, [status])

  const {
    connectionAttempted,
    setConnectionAttempted,
    connectionAttemptRef,
    claimConnectionAttempt,
    isConnecting,
    isManualDisconnect,
    isTimeoutDisconnect,
    isUnmountedRef,
  } = useConnectionOwnership()

  const {
    signalPeriodMs,
    setSignalStatus,
    signalStatus,
    lastDataTime,
    checkSignalStability,
    swapHrListener,
    removeHrListener,
    resetSignalStats,
  } = useHrSignalStats({ currentStatusRef, onHeartRateUpdate })

  /**
   * Liveness half of the watchdog interval: force-cycles a link that has
   * gone quiet past the timeout. The timeout arrives as a parameter (prop
   * value), so this callback stays ref- and setter-only. Extracted from
   * the interval tick.
   */
  const checkDataLiveness = useCallback(
    (livenessTimeoutMs: number) => {
      if (
        currentStatusRef.current === BluetoothConnectionStatus.CONNECTED &&
        lastDataTime.current > 0
      ) {
        const timeSinceLastData = Date.now() - lastDataTime.current

        if (timeSinceLastData > livenessTimeoutMs) {
          // Fix Race Condition: Don't force a disconnect/reconnect if we are already in a connection state transition
          if (isConnecting.current) {
            logger.warn(
              { timeSinceLastData },
              'Watchdog: Connection is in progress. Skipping forced disconnect.'
            )
            return
          }

          setStatus(BluetoothConnectionStatus.RECONNECTING)
          setCustomStatusMessage(BLUETOOTH_MESSAGES.unstableConnection)
          isTimeoutDisconnect.current = true
          if (connectedDeviceRef.current?.gatt)
            connectedDeviceRef.current.gatt.disconnect()
        }
      }
    },
    [isConnecting, isTimeoutDisconnect, lastDataTime]
  )

  useEffect(() => {
    let checkCounter = 0
    const interval = setInterval(() => {
      // Every tick folds gaps into the signal stats; every other tick
      // also probes liveness (counter gating is scheduling, the checks
      // themselves live in the callbacks above).
      checkSignalStability()

      checkCounter++
      if (checkCounter % 2 === 0 && dataLivenessTimeoutMs > 0) {
        checkDataLiveness(dataLivenessTimeoutMs)
      }
    }, heartbeatInterval)

    return () => clearInterval(interval)
  }, [
    dataLivenessTimeoutMs,
    checkSignalStability,
    checkDataLiveness,
    heartbeatInterval,
  ])

  const {
    onDisconnected,
    startWaitingForDevice,
    stopWaitingForDevice,
    reconnectAttempts,
    reconnectTimeoutRef,
    waitingDeviceRef,
  } = useHrmRecovery({
    connectedDeviceRef,
    currentStatusRef,
    connectToGattRef,
    claimConnectionAttempt,
    reconnectHaltedRef,
    isConnecting,
    isManualDisconnect,
    isTimeoutDisconnect,
    isUnmountedRef,
    setStatus,
    setCustomStatusMessage,
    setBatteryLevel,
  })

  const { connectToGatt, abortInFlightConnect, removeDisconnectListener } =
    useGattConnect({
      connectedDeviceRef,
      onDisconnected,
      connectionAttemptRef,
      reconnectHaltedRef,
      isConnecting,
      isManualDisconnect,
      isTimeoutDisconnect,
      isUnmountedRef,
      reconnectAttempts,
      onConnectRef,
      swapHrListener,
      setStatus,
      setCustomStatusMessage,
      setBatteryLevel,
      setSavedDevice,
    })

  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

  const disconnect = useCallback(() => {
    claimConnectionAttempt()
    isManualDisconnect.current = true
    isTimeoutDisconnect.current = false
    reconnectHaltedRef.current = false
    abortInFlightConnect()
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    stopWaitingForDevice()
    if (connectedDeviceRef.current?.gatt?.connected)
      connectedDeviceRef.current.gatt.disconnect()

    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

    setStatus(BluetoothConnectionStatus.DISCONNECTED)
    setCustomStatusMessage(null)
    setSavedDevice(null)
    setBatteryLevel(null)
    setConnectionAttempted(false)
    connectedDeviceRef.current = null
    resetSignalStats()
  }, [
    claimConnectionAttempt,
    abortInFlightConnect,
    reconnectTimeoutRef,
    stopWaitingForDevice,
    isManualDisconnect,
    isTimeoutDisconnect,
    setConnectionAttempted,
    resetSignalStats,
  ])

  const forgetDevice = useCallback(async () => {
    logger.info('Initiating device forget sequence...')
    disconnect()
    setConnectionAttempted(false)
    try {
      Cookies.remove('hrm_device_id')
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.devicePermissionsRevoked)
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget')
      setStatus(BluetoothConnectionStatus.ERROR)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.errorClearingPermissions)
    }
  }, [disconnect, setConnectionAttempted])

  const handleConnectionError = useCallback((error: unknown) => {
    let msg = BLUETOOTH_MESSAGES.unknownError
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') {
        msg = BLUETOOTH_MESSAGES.connectionCancelled
      } else if (error.name === 'SecurityError') {
        msg = BLUETOOTH_MESSAGES.securityError
      } else if (error.name === 'NetworkError') {
        msg = BLUETOOTH_MESSAGES.connectionFailed
      } else {
        msg = BLUETOOTH_MESSAGES.bluetoothError(error.name)
      }
    } else if (error instanceof Error) {
      // Handle our custom timeout error
      if (error.message.includes('timeout')) {
        msg = BLUETOOTH_MESSAGES.connectionTimeout
      } else {
        msg = `Error: ${error.message}`
      }
    }
    setStatus(BluetoothConnectionStatus.ERROR)
    setCustomStatusMessage(BLUETOOTH_MESSAGES.errorWithDetails(msg))
    logger.error({ error }, msg)
  }, [])

  // Saved-device lookup, wrapped so the status writer stays the hook's
  // own setter (the module function is the behavior; see deviceScan).
  const findSavedDevice = useCallback(
    (silent: boolean) => findSavedDeviceImpl(silent, setCustomStatusMessage),
    [setCustomStatusMessage]
  )

  // Cleanup
  useEffect(() => {
    isManualDisconnect.current = false

    // Identities installed below; the cleanup only removes slots that still
    // hold these exact functions (a remount overwrites them with its own).
    let installedControls: HrmTestControls | null = null

    if (
      typeof window !== 'undefined' &&
      clientEnv.NEXT_PUBLIC_TESTING === 'true'
    ) {
      // Test injections claim ownership like any newer operation, so a
      // racing silent auto-connect cannot wipe injected VRT state.
      const setTestStatus: typeof setStatus = (action) => {
        claimConnectionAttempt()
        setStatus(action)
      }
      const setTestMessage: typeof setCustomStatusMessage = (action) => {
        claimConnectionAttempt()
        setCustomStatusMessage(action)
      }
      window.__TEST_CONTROLS__ = {
        ...window.__TEST_CONTROLS__,
        setHrmStatus: setTestStatus,
        setCustomHrmStatusMessage: setTestMessage,
        setSignalStatus,
      }
      installedControls = {
        setHrmStatus: setTestStatus,
        setCustomHrmStatusMessage: setTestMessage,
        setSignalStatus,
      }
    }

    return () => {
      isUnmountedRef.current = true
      removeDisconnectListener()
      removeHrListener()
      // Ref-stability caveat acknowledged: the timeout handle read at cleanup
      // time is the one to clear; eslint-disable for the ref-in-cleanup rule.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      stopWaitingForDevice()
      if (installedControls) teardownTestControls(installedControls)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A live connection ends any wait (covers watcher, poll, and manual wins).
  useEffect(() => {
    if (status === BluetoothConnectionStatus.CONNECTED) stopWaitingForDevice()
  }, [status, stopWaitingForDevice])

  /**
   * Scans for a Bluetooth device, connects to it, and starts streaming heart rate data.
   * Will attempt to reconnect to a previously saved device if one exists.
   * @param userNameFromArgs The user's name for display purposes.
   * @param userAgeFromArgs The user's age, used to calculate max HR.
   * @throws If the connection fails (e.g. user cancellation, WebSocket disconnect).
   */
  const connectAndStream = useCallback(
    async (
      userNameFromArgs?: string,
      userAgeFromArgs?: number,
      options: { silent?: boolean } = {}
    ): Promise<boolean> => {
      const { silent = false } = options

      userDetailsRef.current = {
        name: userNameFromArgs || userName || '',
        age: userAgeFromArgs || userAge || 0,
      }

      if (currentStatusRef.current === BluetoothConnectionStatus.CONNECTED)
        return true
      // A connection attempt is already driving the radio (auto or manual):
      // don't open a second picker or handshake. The in-flight attempt owns
      // the UI; returning false tells this caller it did not connect.
      if (isConnecting.current) {
        logger.info('connectAndStream skipped: connection already in progress')
        return false
      }

      // Manual (non-silent) attempts that actually proceed take UI ownership
      // from any racing silent auto-connect. Skipped attempts (above) claim
      // nothing: they wrote no state, so the in-flight attempt still owns
      // the UI and its completion must land. Silent attempts never claim
      // (see autoConnect).
      if (!silent) {
        // A deliberate tap supersedes any background wait and resumes
        // automation (clears a prior manual stop).
        stopWaitingForDevice()
        isManualDisconnect.current = false
        claimConnectionAttempt()
      }
      // Capture, don't claim: a stale silent failure must not clobber UI
      // state written by a newer operation (same ownership rule as the
      // retry progress writes and autoConnect's completion guard).
      const attemptToken = connectionAttemptRef.current
      if (connectionStatus !== 'Connected') {
        const err = new Error('WebSocket not connected')
        if (!silent) handleConnectionError(err)
        throw err
      }

      let attemptedDevice: BluetoothDevice | null = null
      try {
        logger.info(
          { connectionStatus, savedDevice },
          'connectAndStream called'
        )
        setStatus(BluetoothConnectionStatus.CONNECTING)
        const device = await resolveConnectDevice(silent, {
          savedDevice,
          findSavedDevice,
          onScanning: () => {
            setStatus(BluetoothConnectionStatus.CONNECTING)
            setCustomStatusMessage(BLUETOOTH_MESSAGES.scanningForDevices)
          },
        })

        if (device) {
          attemptedDevice = device
          logger.info({ device: device.name }, 'Connecting to device')
          if (!(await connectToGatt(device, false, true))) return false
          return true
        }
        if (!silent) {
          logger.info('No device to connect')
          throw new Error('No device found or selected for connection.')
        }
        return false // Silent mode: no device available
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
        if (!silent) {
          handleConnectionError(error)
          throw error
        }
        const errorMsg = error instanceof Error ? error.message : String(error)
        logger.info({ error, errorMsg }, 'Silent auto-connect failed.')
        // Reset the status to allow for a manual connection attempt —
        // but only while no newer operation has claimed the UI since,
        // so a late background failure never wipes a manual attempt's
        // CONNECTING/ERROR state. With a known device, wait for it to
        // reappear instead of stopping dead (issue 9806).
        if (connectionAttemptRef.current === attemptToken) {
          if (attemptedDevice) {
            startWaitingForDevice(attemptedDevice)
          } else {
            setStatus(BluetoothConnectionStatus.DISCONNECTED)
          }
        }
        throw error
      }
    },
    [
      connectionStatus,
      savedDevice,
      connectToGatt,
      findSavedDevice,
      handleConnectionError,
      userName,
      userAge,
      // Stable ref object from useHrmMetadataSync; listed for exhaustive-deps.
      userDetailsRef,
      claimConnectionAttempt,
      stopWaitingForDevice,
      startWaitingForDevice,
      isConnecting,
      isManualDisconnect,
      connectionAttemptRef,
    ]
  )

  const autoConnect = useCallback(async (): Promise<void> => {
    // Never auto-connect after a manual stop: disconnect() resets
    // connectionAttempted, so the page effect refires this — without this
    // guard a manual disconnect would silently undo itself 100ms later.
    if (isConnecting.current || isManualDisconnect.current) return

    // Capture, don't claim: silent attempts yield to any newer operation.
    const attempt = connectionAttemptRef.current

    try {
      setConnectionAttempted(true)
      setStatus(BluetoothConnectionStatus.CONNECTING)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.connectingToSavedDevice)

      const deviceFoundAndAttempted = await connectAndStream(
        undefined,
        undefined,
        { silent: true }
      )

      if (!deviceFoundAndAttempted) {
        // Stale-completion guard: a late silent finish must not wipe newer
        // state (a manual connect tap, or test-injected scan state racing
        // this attempt). Only the latest operation owns the UI. A wait
        // armed by the silent attempt also owns it (see connectAndStream).
        if (
          connectionAttemptRef.current === attempt &&
          !waitingDeviceRef.current
        ) {
          setStatus(BluetoothConnectionStatus.DISCONNECTED)
          setCustomStatusMessage(null)
        }
      }
    } catch (error) {
      logger.error({ error }, 'Auto-connect failed')
      if (
        connectionAttemptRef.current === attempt &&
        !waitingDeviceRef.current
      ) {
        setStatus(BluetoothConnectionStatus.DISCONNECTED)
        setCustomStatusMessage(getAutoConnectFailureMessage(error))
      }
    }
  }, [
    connectAndStream,
    isConnecting,
    isManualDisconnect,
    connectionAttemptRef,
    setConnectionAttempted,
    waitingDeviceRef,
  ])

  return {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: status === BluetoothConnectionStatus.CONNECTED,
    isSupported, // Export this flag
    signalPeriodMs,
    lastPeriodMs: signalStatus.last,
    consecutiveSlowPackets: signalStatus.slow,
    connectionAttempted,
  }
}

export default useBluetoothHRM
