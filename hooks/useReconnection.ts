/**
 * @file hooks/useReconnection.ts
 * @description This hook encapsulates the logic for handling automatic reconnection attempts
 * with an exponential backoff strategy. It is designed to be used with a connection-oriented
 * hook like `useBluetoothHRM`.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import logger from '@/utils/logger'

interface UseReconnectionProps {
  onReconnect: () => Promise<void>
  maxAttempts?: number
}

interface UseReconnectionReturn {
  startReconnecting: (reason: 'signal_loss' | 'timeout') => void
  stopReconnecting: () => void
  isReconnecting: boolean
  reconnectionStatus: string | null
  reconnectionReason: 'signal_loss' | 'timeout' | null
}

/**
 * @hook useReconnection
 * @description Manages automatic reconnection attempts with exponential backoff.
 *
 * @param {UseReconnectionProps} props - The props for the hook.
 * @returns {UseReconnectionReturn} An object containing functions and state
 * for managing reconnection.
 */
export const useReconnection = ({
  onReconnect,
  maxAttempts = 5,
}: UseReconnectionProps): UseReconnectionReturn => {
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectionStatus, setReconnectionStatus] = useState<string | null>(
    null
  )
  const [reconnectionReason, setReconnectionReason] = useState<
    'signal_loss' | 'timeout' | null
  >(null)
  const attempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onReconnectRef = useRef(onReconnect)

  useEffect(() => {
    onReconnectRef.current = onReconnect
  }, [onReconnect])

  const stopReconnecting = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    setIsReconnecting(false)
    setReconnectionStatus(null)
    setReconnectionReason(null)
    attempts.current = 0
  }, [])

  const startReconnecting = useCallback(
    (reason: 'signal_loss' | 'timeout') => {
      if (isReconnecting) return

      setIsReconnecting(true)
      setReconnectionReason(reason)
      attempts.current = 1

      const attemptReconnect = () => {
        if (attempts.current > maxAttempts) {
          logger.error(
            { maxAttempts },
            'Max reconnection attempts reached. Giving up.'
          )
          setReconnectionStatus(
            `Failed to reconnect after ${maxAttempts} attempts.`
          )
          stopReconnecting()
          return
        }

        const reasonText = reason === 'timeout' ? 'Timeout' : 'Signal Lost'
        setReconnectionStatus(
          `${reasonText}. Reconnecting... (Attempt ${attempts.current}/${maxAttempts})`
        )

        const baseDelay = 1000 + (attempts.current - 1) * 500
        const randomDelay = baseDelay + Math.random() * 1000

        reconnectTimeoutRef.current = setTimeout(() => {
          onReconnectRef
            .current()
            .then(() => {
              stopReconnecting()
            })
            .catch((error) => {
              if (error.name !== 'AbortError') {
                logger.error(
                  { error, attempt: attempts.current },
                  'Auto-reconnect attempt failed'
                )
                attempts.current++
                attemptReconnect()
              }
            })
        }, randomDelay)
      }
      attemptReconnect()
    },
    [isReconnecting, maxAttempts, stopReconnecting]
  )

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    startReconnecting,
    stopReconnecting,
    isReconnecting,
    reconnectionStatus,
    reconnectionReason,
  }
}
