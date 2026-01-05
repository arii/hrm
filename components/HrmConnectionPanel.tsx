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
import { HrmData } from '@/context/WebSocketContext'
import { EnhancedHrmDataForTile } from '@/types'

// Dynamically import WorkoutExport with SSR disabled
const WorkoutExport = dynamic(() => import('@/components/WorkoutExport'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" width={100} height={36} />,
})

const HrmConnectionPanel = () => {
  const { hrmData, timerData, connectionStatus, activeAlerts } = useWebSocket()
  const [userSettings] = useUserSettings()
  const [workoutRecords, setWorkoutRecords] = useState<
    { time: number; hr: number }[]
  >([])
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  // Lazy initializer for clientId to ensure it's only called on the client
  const [myClientId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('clientId')
    }
    return null
  })

  // Effect to control recording state based on timer phase
  useEffect(() => {
    if (timerData.phase === 'RUNNING' && !isRecording) {
      setSessionStartTime(Date.now())
      setWorkoutRecords([]) // Clear previous records
      setIsRecording(true)
    } else if (timerData.phase !== 'RUNNING' && isRecording) {
      setIsRecording(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerData.phase])

  // Ref to hold the latest hrmData to avoid dependency issues in the recording effect
  const hrmDataRef = useRef(hrmData)
  useEffect(() => {
    hrmDataRef.current = hrmData
  }, [hrmData])

  // Effect for recording data points
  useEffect(() => {
    if (isRecording) {
      const latestRecord = hrmDataRef.current.find(
        (user) => user.clientId === myClientId
      )
      if (latestRecord && latestRecord.hr) {
        setWorkoutRecords((prevRecords) => [
          ...prevRecords,
          { time: Date.now(), hr: latestRecord.hr! },
        ])
      }
    }
  }, [timerData.timeRemaining, isRecording, myClientId]) // Re-run on each timer tick

  const totalCalories = useMemo(() => {
    if (workoutRecords.length === 0) {
      return 0
    }
    // Provide default values if user settings are not yet available or are undefined
    const safeUserAge = userSettings.userAge ?? 30 // Default age if not set
    const safeUserWeight = userSettings.userWeight ?? 70 // Default weight in kg if not set
    return calculateTotalWorkoutCalories({
      age: safeUserAge,
      weight: safeUserWeight,
      gender:
        userSettings.gender === 'MALE'
          ? 'male'
          : userSettings.gender === 'FEMALE'
            ? 'female'
            : undefined,
      workoutDuration: timerData.totalDuration,
      avgHr:
        workoutRecords.reduce((acc, rec) => acc + rec.hr, 0) /
        workoutRecords.length,
    })
  }, [
    userSettings.userAge,
    userSettings.userWeight,
    userSettings.gender,
    timerData.totalDuration,
    workoutRecords,
  ])

  const tileData = useMemo(() => {
    // Use the client ID from state, which is safely initialized client-side
    const currentUserData = hrmData.find((user) => user.clientId === myClientId)

    const otherUsers = hrmData.filter(
      (user) =>
        user.clientId !== myClientId &&
        user.name &&
        !/new user/i.test(user.name)
    )

    // Combine and sort
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

  const workoutData = {
    startTime: sessionStartTime || 0,
    durationSeconds: timerData.totalDuration,
    totalCalories: totalCalories,
    records: workoutRecords,
    userAge: userSettings.userAge || undefined,
    userWeight: userSettings.userWeight || undefined,
    // Ensure gender is 'male', 'female', or undefined
    gender:
      userSettings.gender === 'MALE'
        ? 'male'
        : userSettings.gender === 'FEMALE'
          ? 'female'
          : undefined,
  }

  return (
    <Box
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
              height: '100%', // Ensure the container fills the grid cell
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
                sm: 'calc(50% - 8px)', // Adjusted for 16px gap (gap: 2)
              },
            }}
          >
            <HrTileWrapper user={user} />
          </Box>
        ))
      )}
      {timerData.phase === 'IDLE' && workoutRecords.length > 0 && (
        <WorkoutExport workoutData={workoutData} />
      )}
    </Box>
  )
}
export default HrmConnectionPanel
