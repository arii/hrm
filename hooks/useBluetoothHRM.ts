import { useCallback, useEffect, useRef, useState } from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import logger, { recordConnectionEvent } from './useBluetoothHRM/connectionLog'
import { useWebSocketConnection } from '@/context/WebSocketContext'
import { useHrmMetadataSync } from '@/hooks/useHrmMetadataSync'
import { clientEnv } from '@/lib/env-client'
import Cookies from 'js-cookie'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import { DATA_LIVENESS_TIMEOUT_MS } from '@/constants/bluetooth'
import {
  OTHER_TAB_RELEASE_WAIT_MS,
  PRE_CONNECT_ADVERTISEMENT_WAIT_MS,
  RADIO_TAKEOVER_WAIT_MS,
  RELOAD_FALLBACK_AFTER_FAILURES,
} from '@/constants/bluetooth-reconnection'
import {
  HEARTBEAT_INTERVAL_MS,
  statusMessageMap,
} from './useBluetoothHRM/constants'
import { getAutoConnectFailureMessage } from './useBluetoothHRM/gattClassification'
import {
  resolveConnectDevice,
  findSavedDevice as findSavedDeviceImpl,
  waitForAdvertisement,
} from './useBluetoothHRM/deviceScan'
import {
  teardownTestControls,
  type HrmTestControls,
} from './useBluetoothHRM/testControls'
import { useConnectionOwnership } from './useBluetoothHRM/useConnectionOwnership'
import { useHrSignalStats } from './useBluetoothHRM/useHrSignalStats'
import { useHrmWatchdog } from './useBluetoothHRM/useHrmWatchdog'
import { useHrmRecovery } from './useBluetoothHRM/useHrmRecovery'
import { useGattConnect } from './useBluetoothHRM/useGattConnect'
import { useStuckConnectDetector } from './useBluetoothHRM/useStuckConnectDetector'
import {
  DeviceHeldByOtherTabError,
  useTabCoordination,
} from './useBluetoothHRM/useTabCoordination'

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
 * - useHrmWatchdog: signal-stability/liveness heartbeat
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
    beginRadioOp,
    releaseRadio,
    markRadioProgress,
    radioProgressAtRef,
    isManualDisconnect,
    isTimeoutDisconnect,
    isUnmountedRef,
  } = useConnectionOwnership()
  // Consecutive failed manual connects and stuck-connect auto-resets since
  // the last successful connect; they gate the reload fallback.
  const [manualFailures, setManualFailures] = useState(0)
  const [stuckGaveUp, setStuckGaveUp] = useState(false)
  const stuckResetsRef = useRef(0)
  const preWaitAbortRef = useRef<AbortController | null>(null)

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

  useHrmWatchdog({
    currentStatusRef,
    lastDataTime,
    connectedDeviceRef,
    isConnecting,
    isTimeoutDisconnect,
    setStatus,
    setCustomStatusMessage,
    checkSignalStability,
    dataLivenessTimeoutMs,
    heartbeatInterval,
  })

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
    connectionAttemptRef,
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
      beginRadioOp,
      markRadioProgress,
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

  // Cancels every radio activity this page started: the in-flight connect
  // (and its retry waits), the pre-connect scan, the reconnect timer, and
  // the wait for the strap. Claims ownership so nothing they still have in
  // flight can write the banner afterwards.
  const stopRadioActivity = useCallback(() => {
    claimConnectionAttempt()
    abortInFlightConnect()
    preWaitAbortRef.current?.abort()
    preWaitAbortRef.current = null
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    stopWaitingForDevice()
  }, [
    claimConnectionAttempt,
    abortInFlightConnect,
    reconnectTimeoutRef,
    stopWaitingForDevice,
  ])

  /**
   * In-page equivalent of a reload for the radio state: stop all activity,
   * drop listeners, close a half-open link, clear retry bookkeeping, and
   * free the in-progress flag (waiting at most RADIO_TAKEOVER_WAIT_MS for
   * the cancelled attempt to unwind).
   */
  const hardResetRadio = useCallback(
    async (reason: string) => {
      logger.info({ reason }, 'Resetting Bluetooth state in-page')
      stopRadioActivity()
      removeDisconnectListener()
      removeHrListener()
      const device = connectedDeviceRef.current
      if (
        device?.gatt?.connected &&
        currentStatusRef.current !== BluetoothConnectionStatus.CONNECTED
      ) {
        device.gatt.disconnect()
      }
      reconnectAttempts.current = 0
      reconnectHaltedRef.current = false
      isTimeoutDisconnect.current = false
      await releaseRadio(RADIO_TAKEOVER_WAIT_MS)
    },
    [
      stopRadioActivity,
      removeDisconnectListener,
      removeHrListener,
      reconnectAttempts,
      isTimeoutDisconnect,
      releaseRadio,
    ]
  )

  const disconnect = useCallback(() => {
    stopRadioActivity()
    isManualDisconnect.current = true
    isTimeoutDisconnect.current = false
    reconnectHaltedRef.current = false
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
    stopRadioActivity,
    isManualDisconnect,
    isTimeoutDisconnect,
    setConnectionAttempted,
    resetSignalStats,
  ])

  /**
   * Reset: a true forget. Revokes this site's Bluetooth permission for the
   * strap (device.forget(), which also ends its link in every tab), clears
   * the saved strap, and resets the radio state in-page, so the next
   * Connect opens the chooser in this same tab with no reload.
   */
  const forgetDevice = useCallback(async () => {
    const known = connectedDeviceRef.current ?? savedDevice
    await hardResetRadio('reset')
    disconnect()
    Cookies.remove('hrm_device_id')
    let permitted: BluetoothDevice[] = []
    try {
      permitted = (await navigator.bluetooth?.getDevices?.()) ?? []
    } catch (error) {
      logger.warn({ error }, 'Could not list permitted devices to forget')
    }
    const devices = new Set(known ? [known, ...permitted] : permitted)
    for (const device of devices) {
      if (typeof device.forget !== 'function') continue
      try {
        await device.forget()
        logger.info({ device: device.name }, 'Forgot device permission')
      } catch (error) {
        logger.warn({ device: device.name, error }, 'device.forget() failed')
      }
    }
    stuckResetsRef.current = 0
    setManualFailures(0)
    setStuckGaveUp(false)
    setStatus(BluetoothConnectionStatus.DISCONNECTED)
    setCustomStatusMessage(BLUETOOTH_MESSAGES.deviceForgotten)
  }, [savedDevice, hardResetRadio, disconnect])

  const { otherTabHolding, requestRelease } = useTabCoordination({
    heldDevice:
      status === BluetoothConnectionStatus.CONNECTED ? savedDevice : null,
    onReleaseRequested: (deviceName) => {
      disconnect()
      setCustomStatusMessage(
        BLUETOOTH_MESSAGES.deviceMovedToOtherTab(deviceName)
      )
    },
  })

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
    // Strict Mode replays cleanup then this effect on the same instance.
    isUnmountedRef.current = false

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
      // The timeout handle read at cleanup time is the one to clear.
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      stopWaitingForDevice()
      abortInFlightConnect()
      preWaitAbortRef.current?.abort()
      if (installedControls) teardownTestControls(installedControls)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A live connection ends any wait (covers watcher, poll, and manual wins)
  // and closes the failure episode behind the reload fallback.
  useEffect(() => {
    if (status !== BluetoothConnectionStatus.CONNECTED) return
    stopWaitingForDevice()
    stuckResetsRef.current = 0
    setManualFailures(0)
    setStuckGaveUp(false)
  }, [status, stopWaitingForDevice])

  // Banner history for the copied connection log.
  useEffect(() => {
    recordConnectionEvent('info', 'Banner', { status, text: deviceStatus })
  }, [status, deviceStatus])

  useStuckConnectDetector({
    isConnecting,
    radioProgressAtRef,
    waitingDeviceRef,
    isManualDisconnect,
    connectToGattRef,
    getDevice: () => connectedDeviceRef.current ?? savedDevice,
    hardResetRadio,
    startWaitingForDevice,
    stuckResetsRef,
    onGiveUp: () => {
      setStuckGaveUp(true)
      setStatus(BluetoothConnectionStatus.ERROR)
      setCustomStatusMessage(
        BLUETOOTH_MESSAGES.errorWithDetails(BLUETOOTH_MESSAGES.connectStuck)
      )
    },
    onNoDevice: () => {
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(null)
    },
  })

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
      // A silent attempt never competes with one already driving the radio.
      // A Connect tap does: it cancels the in-flight attempt (whatever state
      // it is stuck in) and starts fresh, so a tap is never a no-op.
      if (isConnecting.current) {
        if (silent) {
          logger.info(
            'connectAndStream skipped: connection already in progress'
          )
          return false
        }
        logger.info('Connect tapped mid-attempt; cancelling it and restarting')
        setStatus(BluetoothConnectionStatus.CONNECTING)
        setCustomStatusMessage(BLUETOOTH_MESSAGES.connecting)
        await hardResetRadio('connect tapped mid-attempt')
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
          const holder = otherTabHolding(device)
          if (holder) {
            // Every tab shares one radio link to the strap: connecting here
            // would drop the other tab's stream mid-workout. A silent
            // attempt leaves it alone; a tap asks that tab to hand it over.
            if (silent) throw new DeviceHeldByOtherTabError(holder.deviceName)
            if (connectionAttemptRef.current === attemptToken) {
              setCustomStatusMessage(
                BLUETOOTH_MESSAGES.connectingToDevice(device.name || '')
              )
            }
            await requestRelease(device, OTHER_TAB_RELEASE_WAIT_MS)
            if (connectionAttemptRef.current !== attemptToken) return false
          }
          attemptedDevice = device
          if (!device.gatt?.connected) {
            // Same in-flight lock as the GATT handshake: a concurrent
            // attempt that got this far is skipped, and one that comes
            // later is skipped at the entry guard.
            if (isConnecting.current) {
              logger.info(
                'connectAndStream skipped: connection already in progress'
              )
              return false
            }
            if (connectionAttemptRef.current === attemptToken) {
              setCustomStatusMessage(
                BLUETOOTH_MESSAGES.lookingForDevice(device.name || '')
              )
            }
            // Capture, don't claim (as connectToGatt does): a disconnect or
            // newer manual attempt during the wait wins.
            const waitToken = connectionAttemptRef.current
            const endRadioOp = beginRadioOp()
            const waitAbort = new AbortController()
            preWaitAbortRef.current = waitAbort
            let seen = false
            try {
              seen = await waitForAdvertisement(
                device,
                PRE_CONNECT_ADVERTISEMENT_WAIT_MS,
                waitAbort.signal
              )
            } finally {
              endRadioOp()
              if (preWaitAbortRef.current === waitAbort) {
                preWaitAbortRef.current = null
              }
            }
            logger.info(
              { device: device.name, seen },
              'Pre-connect advertisement wait finished'
            )
            if (
              isUnmountedRef.current ||
              connectionAttemptRef.current !== waitToken
            ) {
              return false
            }
          }
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
          // Only the attempt that still owns the UI reports its failure: a
          // Reset, disconnect, or newer tap since then owns the banner.
          if (connectionAttemptRef.current === attemptToken) {
            handleConnectionError(error)
            const cancelled =
              error instanceof DOMException && error.name === 'NotFoundError'
            if (!cancelled) setManualFailures((count) => count + 1)
          }
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
      isUnmountedRef,
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
      hardResetRadio,
      otherTabHolding,
      requestRelease,
      beginRadioOp,
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
    showReloadFallback:
      stuckGaveUp || manualFailures >= RELOAD_FALLBACK_AFTER_FAILURES,
  }
}

export default useBluetoothHRM
