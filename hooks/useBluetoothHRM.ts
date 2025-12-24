/**
 * @file useBluetoothHRM.ts
 * @description This file exports a custom React hook, `useBluetoothHRM`, for managing
 * interactions with Bluetooth Low Energy (BLE) Heart Rate Monitor (HRM) devices.
 * It encapsulates the logic for device discovery, connection, disconnection,
 * data streaming, and automatic reconnection on signal loss.
 */
import { useCallback, useState, useRef, useEffect } from 'react'
import {
  HrmInputData,
  HrmMetadataUpdateMessage,
  HrmMetadataUpdateData,
} from '../types/websocket'
import { calculateMaxHr } from '../utils/constants'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'
import { cancellablePromise } from '@/utils/promise'
import { HR_ZONE_DEFINITIONS } from '@/utils/visualization'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

export interface HrDataPoint {
  timestamp: number
  hr: number
}

export type HrZoneData = Record<string, number>

/**
 * @function parseHeartRate
 * @description Parses the heart rate value from the raw DataView received from a BLE device.
 * It handles both 8-bit and 16-bit heart rate value formats based on the flags.
 * @param {DataView} value - The raw data from the heart rate measurement characteristic.
 * @returns {number} The parsed heart rate in beats per minute.
 */
const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}

/**
 * @function setCookie
 * @description Sets a browser cookie with a specified name, value, and expiration.
 * This function is a no-op in non-browser environments.
 * @param {string} name - The name of the cookie.
 * @param {string} value - The value to store in the cookie.
 * @param {number} [days=365] - The number of days until the cookie expires.
 * @sideeffect Creates or updates a cookie in `document.cookie`.
 */
const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; expires=${expires}; path=/`
  }
}

/**
 * @function getCookie
 * @description Retrieves the value of a cookie by its name.
 * Returns an empty string if the cookie is not found or in a non-browser environment.
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string} The decoded value of the cookie.
 */
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return ''
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name && parts[1] ? decodeURIComponent(parts[1]) : r
  }, '')
}

interface UseBluetoothHRMProps {
  dataLivenessTimeoutMs?: number
}

type DisconnectionReason = 'manual' | 'timeout' | 'signal_loss' | null

const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const { dataLivenessTimeoutMs = 10000 } = props
  const { sendData, connectionStatus } = useWebSocket()
  const [deviceStatus, setDeviceStatus] = useState('Disconnected')
  const [disconnectionReason, setDisconnectionReason] =
    useState<DisconnectionReason>(null)
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )
  const [totalCalories, setTotalCalories] = useState(0)
  const [hrHistory, setHrHistory] = useState<HrDataPoint[]>([])
  const [hrZoneDurations, setHrZoneDurations] = useState<HrZoneData>({})

  const statusRef = useRef(deviceStatus)
  const lastDataTime = useRef<number>(0)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const isManualDisconnect = useRef(false)
  const userDetailsRef = useRef<{
    name: string
    age: number
    weightKg: number
    gender: 'male' | 'female'
  } | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const connectToGattRef = useRef<
    ((device: BluetoothDevice) => Promise<boolean>) | null
  >(null)

  useEffect(() => {
    statusRef.current = deviceStatus
  }, [deviceStatus])

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (deviceRef.current?.gatt?.connected)
        deviceRef.current.gatt.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!dataLivenessTimeoutMs) return

    const interval = setInterval(() => {
      if (
        statusRef.current.startsWith('Connected') &&
        lastDataTime.current > 0
      ) {
        if (Date.now() - lastDataTime.current > dataLivenessTimeoutMs) {
          logger.warn('Bluetooth data stale. Forcing reconnection...')
          setDisconnectionReason('timeout')
          setDeviceStatus('Connection unstable. Reconnecting...')
          if (deviceRef.current?.gatt?.connected)
            deviceRef.current.gatt.disconnect()
        }
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [dataLivenessTimeoutMs])

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true
    setDisconnectionReason('manual')
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (deviceRef.current?.gatt?.connected) deviceRef.current.gatt.disconnect()

    setDeviceStatus('Disconnected')
    setSavedDevice(null)
    setBatteryLevel(null)
    deviceRef.current = null
  }, [])

  const forgetDevice = useCallback(async () => {
    logger.info('Initiating device forget sequence...')
    disconnect()
    try {
      setCookie('hrm_device_id', '', -1)
      if (navigator.bluetooth && navigator.bluetooth.getDevices) {
        const devices = await navigator.bluetooth.getDevices()
        for (const device of devices) {
          if (device.forget) await device.forget()
        }
      }
      setDeviceStatus('Device permissions revoked. Ready for new connection.')
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget')
      setDeviceStatus('Error clearing device permissions.')
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
    setDeviceStatus(`Failed: ${msg}`)
  }, [])

  const onDisconnected = useCallback(() => {
    setBatteryLevel(null)
    if (!isManualDisconnect.current && deviceRef.current) {
      logger.info(
        { device: deviceRef.current.name },
        'Device disconnected, attempting auto-reconnect...'
      )
      setDisconnectionReason('signal_loss')
      setDeviceStatus('Signal Lost. Retrying...')
      const deviceToReconnect = deviceRef.current
      reconnectTimeoutRef.current = setTimeout(() => {
        if (connectToGattRef.current)
          connectToGattRef.current(deviceToReconnect)
      }, 2000)
    } else {
      logger.info('Device disconnected manually.')
      setDeviceStatus('Disconnected')
    }
  }, [])

  const connectToGatt = useCallback(
    async (device: BluetoothDevice) => {
      try {
        deviceRef.current = device
        setDeviceStatus(`Connecting to: ${device.name || 'Device'}...`)

        abortControllerRef.current = new AbortController()
        const server = await cancellablePromise(device.gatt!.connect(), {
          timeoutMs: 10000,
          errorMessage: 'GATT connection timeout',
          signal: abortControllerRef.current.signal,
        })

        const service = await server.getPrimaryService(HR_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )

        try {
          const batteryService =
            await server.getPrimaryService(BATTERY_SERVICE_UUID)
          const batteryChar = await batteryService.getCharacteristic(
            BATTERY_LEVEL_CHARACTERISTIC_UUID
          )
          const value = await batteryChar.readValue()
          setBatteryLevel(value.getUint8(0))
          await batteryChar.startNotifications()
          batteryChar.addEventListener(
            'characteristicvaluechanged',
            (e: unknown) => {
              const event = e as Event
              const target = event.target as BluetoothRemoteGATTCharacteristic
              setBatteryLevel(target.value!.getUint8(0))
            }
          )
        } catch (_err) {
          /* Battery service optional */
        }

        await characteristic.startNotifications()
        lastDataTime.current = Date.now()
        let lastHrTime = Date.now()
        let accumulatedCalories = 0

        characteristic.addEventListener(
          'characteristicvaluechanged',
          (event: unknown) => {
            const e = event as Event
            const target = e.target as BluetoothRemoteGATTCharacteristic
            const heartRate = parseHeartRate(target.value!)
            const now = Date.now()
            lastDataTime.current = now

            const { name, age, weightKg, gender } =
              userDetailsRef.current || {}

            const dt = now - lastHrTime
            if (dt > 0 && age && weightKg && gender) {
              const dtMinutes = dt / (1000 * 60)
              let calories = 0
              if (gender === 'male') {
                calories =
                  (-55.0969 +
                    0.6309 * heartRate +
                    0.1988 * weightKg +
                    0.2017 * age) /
                  4.184
              } else {
                calories =
                  (-20.4022 +
                    0.4472 * heartRate -
                    0.1263 * weightKg +
                    0.074 * age) /
                  4.184
              }
              calories *= dtMinutes

              if (calories > 0) {
                accumulatedCalories += calories
                setTotalCalories(accumulatedCalories)
              }
            }
            lastHrTime = now

            setHrHistory((prev) => {
              const newHistory = [...prev, { timestamp: now, hr: heartRate }]
              if (newHistory.length > 300) {
                return newHistory.slice(newHistory.length - 300)
              }
              return newHistory
            })

            const calculatedMaxHr = calculateMaxHr(age)
            const currentZone = HR_ZONE_DEFINITIONS.find(
              (zone) =>
                heartRate >= calculatedMaxHr * zone.range[0] &&
                heartRate <= calculatedMaxHr * zone.range[1]
            )
            if (currentZone) {
              setHrZoneDurations((prev) => ({
                ...prev,
                [currentZone.name]: (prev[currentZone.name] || 0) + dt,
              }))
            }

            const metadataData: HrmMetadataUpdateData = {
              maxHr: calculatedMaxHr,
              name: name || `Bluetooth HRM (${device.name || 'Unknown'})`,
            }
            if (typeof age === 'number') {
              metadataData.age = age
            }

            const metadata: HrmMetadataUpdateMessage = {
              type: 'HRM_METADATA_UPDATE',
              data: metadataData,
            }
            sendData(metadata)

            const data: HrmInputData = {
              value: heartRate,
              calories: accumulatedCalories,
            }

            sendData({
              type: 'HRM_INPUT',
              data,
            })
          }
        )

        device.addEventListener('gattserverdisconnected', onDisconnected)

        setDeviceStatus(`Connected to: ${device.name}`)
        setSavedDevice(device)
        setCookie('hrm_device_id', device.id)
        isManualDisconnect.current = false
        setDisconnectionReason(null)
        return true
      } catch (error) {
        logger.error({ error, device: device.name }, 'GATT Connection failed')
        throw error
      }
    },
    [onDisconnected, sendData]
  )

  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

  const connectAndStream = useCallback(
    async (
      userName?: string,
      userAge?: number,
      userWeightKg?: number,
      userGender?: 'male' | 'female'
    ): Promise<void> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      userDetailsRef.current = {
        name: userName || '',
        age: userAge || 0,
        weightKg: userWeightKg || 0,
        gender: userGender || 'male',
      }
      if (statusRef.current.startsWith('Connected')) return
      if (connectionStatus !== 'Connected') {
        const err = new Error('WebSocket not connected')
        handleConnectionError(err)
        throw err
      }

      try {
        setDeviceStatus('Checking saved devices...')
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

        if (!device) {
          setDeviceStatus('Scanning for devices...')
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }

        if (device) {
          await connectToGatt(device)
        }
      } catch (error) {
        handleConnectionError(error)
        throw error
      }
    },
    [connectionStatus, savedDevice, connectToGatt, handleConnectionError]
  )

  return {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: deviceStatus.startsWith('Connected'),
    isSupported,
    disconnectionReason,
    totalCalories,
    hrHistory,
    hrZoneDurations,
  }
}

export default useBluetoothHRM
