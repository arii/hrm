// hooks/useAutoStartNotification.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { WORKOUT_AUTO_START_NOTIFICATION_DURATION_SECONDS } from '@/constants/workout'

interface AutoStartNotificationProps {
  autoStartState: 'idle' | 'monitoring' | 'triggered'
  startWorkout: () => void
  cancelAutoStart: () => void
}

export const useAutoStartNotification = ({
  autoStartState,
  startWorkout,
  cancelAutoStart,
}: AutoStartNotificationProps) => {
  const [showNotification, setShowNotification] = useState(false)
  const [countdown, setCountdown] = useState(
    WORKOUT_AUTO_START_NOTIFICATION_DURATION_SECONDS
  )
  const countdownTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (autoStartState === 'triggered' && !showNotification) {
      setShowNotification(true)
      setCountdown(WORKOUT_AUTO_START_NOTIFICATION_DURATION_SECONDS)
    } else if (autoStartState !== 'triggered' && showNotification) {
      setShowNotification(false)
    }
  }, [autoStartState, showNotification])

  useEffect(() => {
    if (showNotification) {
      countdownTimer.current = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            if (countdownTimer.current) {
              clearInterval(countdownTimer.current)
            }
            startWorkout()
            setShowNotification(false)
            return 0
          }
          return prevCountdown - 1
        })
      }, 1000)
    }

    return () => {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current)
      }
    }
  }, [showNotification, startWorkout])

  const handleCancel = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current)
    }
    cancelAutoStart()
    setShowNotification(false)
  }, [cancelAutoStart])

  return { showNotification, countdown, handleCancel }
}
