import { useCallback, useState, useRef, useEffect } from 'react'
import { BluetoothConnectionStatus } from '../types/bluetooth'
import logger from '@/utils/logger'
import { cancellablePromise } from '@/utils/promise'
import { getCookie, setCookie } from '@/utils/cookies'

const statusMessageMap: Record<BluetoothConnectionStatus, string> = {
  [BluetoothConnectionStatus.DISCONNECTED]: 'Disconnected',
  [BluetoothConnectionStatus.CONNECTING]: 'Connecting...',
  [BluetoothConnectionStatus.CONNECTED]: 'Connected',
  [BluetoothConnectionStatus.RECONNECTING]: 'Reconnecting...',
  [BluetoothConnectionStatus.ERROR]: 'Error',
}

const HR_SERVICE_UUID = 'heart_rate'
const BATTERY_SERVICE_UUID = 'battery_service'

interface UseBluetoothConnectionProps {
  onConnect?: (server: BluetoothRemoteGATTServer) => void
  onDisconnect?: () => void
}

const useBluetoothConnection = (props: UseBluetoothConnectionProps = {}) => {
  const { onConnect, onDisconnect } = props
  const [status, setStatus] = useState<BluetoothConnectionStatus>(
    BluetoothConnectionStatus.DISCONNECTED
  )
  const [customStatusMessage, setCustomStatusMessage] = useState<string | null>(
    null
  )
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const deviceStatus = customStatusMessage ?? statusMessageMap[status]

  const statusRef = useRef(status)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnecting = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)
  const connectToGattRef = useRef<
    ((device: BluetoothDevice) => Promise<boolean>) | null
  >(null)

  useEffect(() => {
    onConnectRef.current = onConnect
  }, [onConnect])

  useEffect(() => {
    onDisconnectRef.current = onDisconnect
  }, [onDisconnect])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    isManualDisconnect.current = false
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    }
  }, [])

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (deviceRef.current?.gatt?.connected) deviceRef.current.gatt.disconnect()

    setStatus(BluetoothConnectionStatus.DISCONNECTED)
    setCustomStatusMessage(null)
    setSavedDevice(null)
    deviceRef.current = null
  }, [])

  const forgetDevice = useCallback(async () => {
    logger.info('Initiating device forget sequence...')
    disconnect()
    try {
      setCookie('hrm_device_id', '', -1)
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(
        'Device permissions revoked. Ready for new connection.'
      )
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget')
      setStatus(BluetoothConnectionStatus.ERROR)
      setCustomStatusMessage('Error clearing device permissions.')
    }
  }, [disconnect])

  const handleConnectionError = useCallback((error: unknown) => {
    let msg = 'An unknown error occurred.'
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') {
        msg = 'Connection cancelled. No device selected.'
      } else if (error.name === 'SecurityError') {
        msg = 'Security error. Use HTTPS or localhost.'
      } else if (error.name === 'NetworkError') {
        msg = 'Connection failed. Device might be too far or low battery.'
      } else {
        msg = `Bluetooth error: ${error.name}`
      }
    } else if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        msg = 'Connection timed out. Wake up device and try again.'
      } else {
        msg = `Error: ${error.message}`
      }
    }
    setStatus(BluetoothConnectionStatus.ERROR)
    setCustomStatusMessage(`Failed: ${msg}`)
    logger.error({ error }, msg)
  }, [])

  const onDisconnected = useCallback(() => {
    onDisconnectRef.current?.()

    if (
      !isManualDisconnect.current &&
      deviceRef.current &&
      !isConnecting.current
    ) {
      reconnectAttempts.current += 1
      const device = deviceRef.current
      const attemptNum = reconnectAttempts.current

      logger.info(
        {
          device: device.name,
          attempt: attemptNum,
          maxAttempts: maxReconnectAttempts,
        },
        'Device disconnected, attempting auto-reconnect...'
      )

      if (attemptNum <= maxReconnectAttempts) {
        setStatus(BluetoothConnectionStatus.RECONNECTING)
        setCustomStatusMessage(
          `Signal Lost. Reconnecting... (Attempt ${attemptNum}/${maxReconnectAttempts})`
        )

        const baseDelay = 1000 + (attemptNum - 1) * 500
        const randomDelay = baseDelay + Math.random() * 1000

        reconnectTimeoutRef.current = setTimeout(() => {
          if (connectToGattRef.current) {
            connectToGattRef.current(device).catch((error) => {
              if (error.name !== 'AbortError') {
                logger.error(
                  { error, device: device.name, attempt: attemptNum },
                  'Auto-reconnect attempt failed'
                )
              }
            })
          }
        }, randomDelay)
      } else {
        logger.error(
          { device: device.name, maxAttempts: maxReconnectAttempts },
          'Max reconnection attempts reached. Resetting device.'
        )
        setStatus(BluetoothConnectionStatus.ERROR)
        setCustomStatusMessage(
          `Failed to reconnect after ${maxReconnectAttempts} attempts. Resetting device...`
        )

        reconnectTimeoutRef.current = setTimeout(async () => {
          isManualDisconnect.current = true
          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }
          setCookie('hrm_device_id', '', -1)
          setStatus(BluetoothConnectionStatus.DISCONNECTED)
          setCustomStatusMessage(
            'Device permissions revoked. Ready for new connection.'
          )
          setSavedDevice(null)
          deviceRef.current = null
          reconnectAttempts.current = 0
        }, 2000)
      }
    } else {
      logger.info('Device disconnected manually.')
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(null)
      reconnectAttempts.current = 0
    }
  }, [])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice): Promise<boolean> => {
      if (isConnecting.current) {
        logger.warn(
          { device: device.name },
          'Aborting previous pending connection attempt'
        )
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }
      try {
        isConnecting.current = true
        deviceRef.current = device
        setStatus(BluetoothConnectionStatus.CONNECTING)
        setCustomStatusMessage(`Connecting to: ${device.name || 'Device'}...`)

        abortControllerRef.current = new AbortController()

        let server: BluetoothRemoteGATTServer | undefined
        let attempt = 0
        const maxRetries = 3

        while (true) {
          try {
            server = await cancellablePromise(device.gatt!.connect(), {
              timeoutMs: 30000,
              errorMessage: 'GATT connection timeout',
              signal: abortControllerRef.current.signal,
            })
            break
          } catch (error) {
            const err = error as DOMException | Error
            const errorName = 'name' in err ? err.name : 'Error'
            const errorMsg = err.message || ''
            const isZombieError =
              errorName === 'NetworkError' ||
              errorMsg.includes('range') ||
              errorMsg.includes('busy')

            if (
              isZombieError &&
              attempt < maxRetries &&
              !abortControllerRef.current.signal.aborted
            ) {
              attempt++
              const delayMs = Math.pow(2, attempt) * 1000
              logger.warn(
                { device: device.name, attempt, delayMs, errorMsg },
                'Device likely busy (Zombie connection). Retrying...'
              )
              setStatus(BluetoothConnectionStatus.CONNECTING)
              setCustomStatusMessage(
                `Device busy. Retrying in ${delayMs / 1000}s...`
              )
              await new Promise((resolve) => setTimeout(resolve, delayMs))
              continue
            } else {
              throw error
            }
          }
        }

        if (abortControllerRef.current?.signal.aborted) {
          server?.disconnect()
          throw new DOMException('Connection aborted', 'AbortError')
        }

        device.addEventListener('gattserverdisconnected', onDisconnected)

        setStatus(BluetoothConnectionStatus.CONNECTED)
        setCustomStatusMessage(`Connected to: ${device.name}`)
        setSavedDevice(device)
        setCookie('hrm_device_id', device.id)
        isManualDisconnect.current = false
        reconnectAttempts.current = 0
        onConnectRef.current?.(server!)
        return true
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const errorName = error instanceof DOMException ? error.name : 'Error'

        const isIntentionalAbort =
          errorName === 'AbortError' &&
          abortControllerRef.current?.signal.aborted

        if (!isIntentionalAbort) {
          logger.error(
            { errorName, errorMsg, device: device.name },
            'GATT Connection failed'
          )
        }

        if (errorMsg.includes('timeout')) {
          setStatus(BluetoothConnectionStatus.ERROR)
          setCustomStatusMessage('Connection timeout. Resetting device...')
          reconnectAttempts.current = maxReconnectAttempts
          deviceRef.current = null

          if (reconnectTimeoutRef.current)
            clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = setTimeout(() => {
            isManualDisconnect.current = true
            if (abortControllerRef.current) {
              abortControllerRef.current.abort()
            }
            setCookie('hrm_device_id', '', -1)
            setStatus(BluetoothConnectionStatus.DISCONNECTED)
            setCustomStatusMessage(
              'Device permissions revoked. Ready for new connection.'
            )
            setSavedDevice(null)
            deviceRef.current = null
            reconnectAttempts.current = 0
          }, 2000)
        } else if (!isIntentionalAbort) {
          deviceRef.current = null
        }

        throw error
      } finally {
        isConnecting.current = false
      }
    },
    [onDisconnected]
  )

  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

  const connect = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options

      if (statusRef.current === BluetoothConnectionStatus.CONNECTED) return

      try {
        let device = savedDevice

        if (!device) {
          const savedDeviceId = getCookie('hrm_device_id')
          if (savedDeviceId && navigator.bluetooth?.getDevices) {
            const devices = await navigator.bluetooth.getDevices()
            const foundDevice = devices.find((d) => d.id === savedDeviceId)

            if (foundDevice) {
              await connectToGatt(foundDevice)
              return
            }
          }
        }

        if (!device && !silent) {
          setStatus(BluetoothConnectionStatus.CONNECTING)
          setCustomStatusMessage('Scanning for devices...')
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }

        if (device) {
          await connectToGatt(device)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
        if (!silent) {
          handleConnectionError(error)
        } else {
          setStatus(BluetoothConnectionStatus.DISCONNECTED)
          setCustomStatusMessage(null)
        }
        if (!silent) {
          throw error
        }
      }
    },
    [savedDevice, connectToGatt, handleConnectionError]
  )

  const autoConnect = useCallback(async () => {
    try {
      setStatus(BluetoothConnectionStatus.CONNECTING)
      setCustomStatusMessage('Connecting to saved device...')
      await connect({ silent: true })
    } catch (error) {
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(
        'Auto-connect failed. Use Connect button to select device.'
      )
    }
  }, [connect])

  return {
    connect,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    isConnected: status === BluetoothConnectionStatus.CONNECTED,
    isSupported,
    device: deviceRef.current,
  }
}

export default useBluetoothConnection
