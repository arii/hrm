// hooks/useWorkoutAutoStart.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { useUserSettings } from '../context/UserSettingsContext'
import { useWebSocket } from '../context/WebSocketContext'

interface UseWorkoutAutoStartProps {
  startWorkout: () => void
  workoutStatus: 'idle' | 'running' | 'paused'
}

const COUNTDOWN_DURATION = 10 // seconds

export const useWorkoutAutoStart = ({
  startWorkout,
  workoutStatus,
}: UseWorkoutAutoStartProps) => {
  const [userSettings] = useUserSettings()
  const { hrmData } = useWebSocket()
  const [status, setStatus] = useState<'idle' | 'detecting' | 'countdown'>(
    'idle'
  )

  const sustainedHrTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const toastIdRef = useRef<string | null>(null)

  const cancelAutoStart = useCallback(() => {
    if (sustainedHrTimerRef.current) clearTimeout(sustainedHrTimerRef.current)
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    sustainedHrTimerRef.current = null
    countdownTimerRef.current = null

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current)
      toastIdRef.current = null
    }

    if (status !== 'idle') {
      toast.error('Workout auto-start cancelled.')
    }

    setStatus('idle')
  }, [status])

  useEffect(() => {
    const {
      autoStartWorkout,
      autoStartHeartRate,
      autoStartSustainedDuration,
    } = userSettings
    const isIdle = workoutStatus === 'idle'
    const hasHrmData = hrmData.length > 0

    if (!autoStartWorkout || !isIdle || !hasHrmData) {
      if (status !== 'idle') {
        cancelAutoStart()
      }
      return
    }

    const primaryUserHr = hrmData[0]?.heartRate ?? 0

    if (primaryUserHr >= autoStartHeartRate) {
      if (status === 'idle') {
        setStatus('detecting')
        toastIdRef.current = toast.loading(
          'Sustained high heart rate detected...'
        )
        sustainedHrTimerRef.current = setTimeout(() => {
          setStatus('countdown')
        }, autoStartSustainedDuration * 1000)
      }
    } else {
      if (status === 'detecting') {
        cancelAutoStart()
      }
    }

    // Cleanup function to clear the timer if the component unmounts
    return () => {
      if (sustainedHrTimerRef.current) {
        clearTimeout(sustainedHrTimerRef.current)
      }
    }
  }, [userSettings, workoutStatus, hrmData, status, cancelAutoStart])

  useEffect(() => {
    if (status === 'countdown') {
      toast.dismiss(toastIdRef.current ?? undefined)

      toastIdRef.current = toast.custom(
        (t) => (
          <Box
            sx={{
              backgroundColor: 'background.paper',
              color: 'text.primary',
              padding: 2,
              borderRadius: 1,
              boxShadow: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span>Starting in {COUNTDOWN_DURATION}s...</span>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                cancelAutoStart()
                toast.dismiss(t.id)
              }}
            >
              Cancel
            </Button>
          </Box>
        ),
        {
          duration: COUNTDOWN_DURATION * 1000,
        }
      )

      countdownTimerRef.current = setTimeout(() => {
        toast.success('Workout session started automatically!')
        startWorkout()
        setStatus('idle')
        toastIdRef.current = null
      }, COUNTDOWN_DURATION * 1000)
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current)
      }
    }
  }, [status, startWorkout, cancelAutoStart])

  return {
    autoStartStatus: status,
    cancelAutoStart,
  }
}
