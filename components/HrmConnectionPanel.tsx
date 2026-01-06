// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo, useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useWebSocket } from '@/context/WebSocketContext'
import { useUserSettings } from '@/context/UserSettingsContext'
import HrTileWrapper from '@/components/HrTileWrapper'
import { calculateTotalWorkoutCalories } from '@/lib/calorie-estimation'
import { WorkoutExportData } from '@/types'

// Dynamically import WorkoutExport with SSR disabled to avoid hydration errors
const WorkoutExport = dynamic(
  () =>
    import(
      /* webpackChunkName: "WorkoutExport" */ '@/components/WorkoutExport'
    ),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" width={100} height={36} />,
  }
)

/**
 * Custom hook to get the previous value of a prop or state.
 * @param value The value to track.
 * @returns The value from the previous render.
 */
function usePrevious<T>(value: T) {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

const HrmConnectionPanel = () => {
  const { hrmData, timerData, connectionStatus, activeAlerts } = useWebSocket()
  const [userSettings] = useUserSettings()

  // Lazy initialize state from localStorage to avoid setting state in an effect
  const [workoutRecords, setWorkoutRecords] = useState<
    { time: number; hr: number }[]
  >(() => {
    if (typeof window === 'undefined') {
      return []
    }
    try {
      const storedRecords = localStorage.getItem('workoutRecords')
      return storedRecords ? JSON.parse(storedRecords) : []
    } catch (error) {
      console.error('Failed to load workout records from localStorage', error)
      return []
    }
  })

  const [sessionStartTime, setSessionStartTime] = useState<number | null>(
    () => {
      if (typeof window === 'undefined') {
        return null
      }
      try {
        const storedStartTime = localStorage.getItem('sessionStartTime')
        return storedStartTime ? JSON.parse(storedStartTime) : null
      } catch (error) {
        console.error('Failed to load start time from localStorage', error)
        return null
      }
    }
  )

  // This effect now only handles cleanup on component unmount
  useEffect(() => {
    return () => {
      localStorage.removeItem('workoutRecords')
      localStorage.removeItem('sessionStartTime')
    }
  }, [])

  // Lazy initializer for clientId to ensure it's only called on the client
  const [myClientId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('clientId')
    }
    return null
  })

  // Derive recording state directly from timer phase
  const isRecording = timerData.currentPhase === 'RUNNING'
  const prevIsRecording = usePrevious(isRecording)

  // Use a ref to get the latest workoutRecords in the effect without adding it as a dependency
  const workoutRecordsRef = useRef(workoutRecords)
  useEffect(() => {
    workoutRecordsRef.current = workoutRecords
  }, [workoutRecords])

  // Effect to manage the start and stop of a workout session
  useEffect(() => {
    if (isRecording && !prevIsRecording) {
      const startTime = Date.now()
      setSessionStartTime(startTime)
      setWorkoutRecords([]) // Clear previous records
      localStorage.setItem('workoutRecords', '[]')
      localStorage.setItem('sessionStartTime', JSON.stringify(startTime))
    } else if (!isRecording && prevIsRecording) {
      localStorage.setItem(
        'workoutRecords',
        JSON.stringify(workoutRecordsRef.current)
      )
    }
  }, [isRecording, prevIsRecording])

  // Effect for recording data points every second during a workout
  useEffect(() => {
    let animationFrameId: number
    const record = () => {
      if (isRecording) {
        const latestRecord = hrmData.find(
          (user) => user.clientId === myClientId
        )
        if (latestRecord?.value) {
          setWorkoutRecords((prevRecords) => [
            ...prevRecords,
            { time: Date.now(), hr: latestRecord.value as number },
          ])
        }
        animationFrameId = requestAnimationFrame(record)
      }
    }
    animationFrameId = requestAnimationFrame(record)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isRecording, myClientId, hrmData])

  const totalCalories = useMemo(() => {
    if (workoutRecords.length === 0) {
      return 0
    }
    const safeUserAge = userSettings.userAge ?? 30
    const safeUserWeight = userSettings.userWeight ?? 70
    return calculateTotalWorkoutCalories({
      age: safeUserAge,
      weight: safeUserWeight,
      gender:
        userSettings.gender === 'MALE'
          ? 'male'
          : userSettings.gender === 'FEMALE'
          ? 'female'
          : undefined,
      workoutDuration: timerData.timeElapsed,
      avgHr:
        workoutRecords.reduce((acc, rec) => acc + rec.hr, 0) /
        workoutRecords.length,
    })
  }, [
    userSettings.userAge,
    userSettings.userWeight,
    userSettings.gender,
    timerData.timeElapsed,
    workoutRecords,
  ])

  const tileData = useMemo(() => {
    const currentUserData = hrmData.find((user) => user.clientId === myClientId)
    const otherUsers = hrmData.filter(
      (user) =>
        user.clientId !== myClientId &&
        user.name &&
        !/new user/i.test(user.name)
    )
    const combinedUsers = [
      ...(currentUserData
        ? [{ ...currentUserData, name: 'You', isActive: true }]
        : []),
      ...otherUsers,
    ].sort((a, b) => {
      if (a.name === 'You') return -1
      if (b.name === 'You') return 1
      return (a.name || '').localeCompare(b.name || '')
    })
    return combinedUsers.map((user) => {
      const matchingAlert = activeAlerts.find(
        (alert) =>
          alert.clientId === user.clientId &&
          (alert.code === 'BAD_PLACEMENT' || alert.code === 'HRM_STALE')
      )
      return {
        ...user,
        isAlerting: !!matchingAlert,
        alertMessage: matchingAlert?.message,
      }
    })
  }, [hrmData, myClientId, activeAlerts])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  const workoutData: WorkoutExportData = {
    startTime: sessionStartTime || 0,
    durationSeconds: timerData.timeElapsed,
    totalCalories: totalCalories,
    records: workoutRecords,
    userAge: userSettings.userAge,
    userWeight: userSettings.userWeight,
    gender:
      userSettings.gender === 'MALE'
        ? 'male'
        : userSettings.gender === 'FEMALE'
        ? 'female'
        : undefined,
  }

  return (
    <Box
      data-testid="hrm-connection-panel"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        height: '100%',
      }}
    >
      {isLoading || tileData.length === 0 ? (
        <>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: { xs: '100%', sm: 'calc(50% - 8px)' },
              height: '100%',
              gap: 2,
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom>
              No Heart Rate Data
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center">
              Heart rate data will be displayed here once a monitor is connected
              and streaming.
            </Typography>
          </Box>
          <Box
            data-testid="hr-tile-grid-item"
            sx={{
              display: { xs: 'none', md: 'block' },
              width: { sm: 'calc(50% - 12px)' },
            }}
          >
            <Skeleton
              variant="rectangular"
              height={220}
              sx={{ borderRadius: 3 }}
            />
          </Box>
        </>
      ) : (
        tileData.map((user) => (
          <Box
            key={user.clientId}
            data-testid="hr-tile-grid-item"
            sx={{
              width: {
                xs: '100%',
                sm: 'calc(50% - 8px)',
              },
            }}
          >
            <HrTileWrapper user={user} />
          </Box>
        ))
      )}
      {timerData.currentPhase === 'IDLE' && workoutRecords.length > 0 && (
        <WorkoutExport workoutData={workoutData} />
      )}
    </Box>
  )
}
export default HrmConnectionPanel
