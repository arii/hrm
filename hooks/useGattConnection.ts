/**
 * @file hooks/useGattConnection.ts
 * @description This hook manages the connection to a Bluetooth device's GATT server,
 * including retry logic for common connection issues ("zombie" connections).
 */
import { useState, useCallback, useRef } from 'react'
import logger from '@/utils/logger'
import { cancellablePromise } from '@/utils/promise'

export type GattConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

interface UseGattConnectionReturn {
  connect: (device: BluetoothDevice) => Promise<BluetoothRemoteGATTServer>
  disconnect: (device: BluetoothDevice) => void
  server: BluetoothRemoteGATTServer | null
  status: GattConnectionStatus
  error: string | null
}

/**
 * @hook useGattConnection
 * @description Manages the connection to a Bluetooth device's GATT server.
 * It encapsulates the logic for establishing a connection, including handling
 * the "zombie" connection issue with an exponential backoff retry mechanism.
 *
 * @returns {UseGattConnectionReturn} An object containing functions and state
 * for managing the GATT connection.
 */
export const useGattConnection = (): UseGattConnectionReturn => {
  const [status, setStatus] = useState<GattConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [server, setServer] = useState<BluetoothRemoteGATTServer | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const disconnect = useCallback((device: BluetoothDevice) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (device.gatt?.connected) {
      device.gatt.disconnect()
    }
    setServer(null)
    setStatus('disconnected')
  }, [])

  const connect = useCallback(
    async (device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      setStatus('connecting')
      setError(null)

      try {
        let gattServer: BluetoothRemoteGATTServer | undefined
        let attempt = 0
        const maxRetries = 3

        while (true) {
          try {
            gattServer = await cancellablePromise(device.gatt!.connect(), {
              timeoutMs: 30000,
              errorMessage: 'GATT connection timeout',
              signal: abortControllerRef.current.signal,
            })
            break // Success
          } catch (e) {
            const err = e as DOMException | Error
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
              await new Promise((resolve) => setTimeout(resolve, delayMs))
              continue // Retry
            } else {
              throw err
            }
          }
        }

        if (abortControllerRef.current?.signal.aborted) {
          gattServer?.disconnect()
          throw new DOMException('Connection aborted', 'AbortError')
        }

        setServer(gattServer!)
        setStatus('connected')
        return gattServer!
      } catch (e) {
        const err = e as Error
        logger.error({ error: err }, 'GATT Connection failed')
        setError(err.message)
        setStatus('error')
        setServer(null)
        throw err
      }
    },
    []
  )

  return { connect, disconnect, server, status, error }
}
