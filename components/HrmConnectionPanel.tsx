// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useWebSocket } from '@/context/WebSocketContext'
import { useUserSettings } from '@/context/UserSettingsContext'
import HrTileWrapper from '@/components/HrTileWrapper'
import WorkoutExport from '@/components/WorkoutExport'
import { estimateCaloriesBurned } from '@/lib/calorie-estimation'

// Define the type for HrmData structure to ensure type safety
interface HrmUser {
  clientId: string
  hr?: number
  name?: string | null
}

const HrmConnectionPanel = () => {
  const { hrmData, timerData, connectionStatus, activeAlerts } = useWebSocket()
  const [userSettings] = useUserSettings()
  const [workoutRecords, setWorkoutRecords] = useState<
    { time: number; hr: number }[]
  >([])
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  // State to hold the client ID, ensuring localStorage is accessed client-side
  const [myClientId, setMyClientId] = useState<string | null>(null)

  useEffect(() => {
    // Only access localStorage on the client side after the component mounts
    if (typeof window !== 'undefined' && myClientId === null) {
      setMyClientId(localStorage.getItem('clientId'))
    }
  }, [myClientId])

  useEffect(() => {
    if (timerData.phase === 'RUNNING' && timerData.timeRemaining > 0) {
      if (sessionStartTime === null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSessionStartTime(Date.now())
      }
      const latestRecord = hrmData.find((user) => user.clientId === myClientId)
      if (latestRecord && latestRecord.hr) {
        setWorkoutRecords((prevRecords) => [
          ...prevRecords,
          { time: Date.now(), hr: latestRecord.hr! },
        ])
      }
    } else if (timerData.phase === 'IDLE' && sessionStartTime !== null) {
      setSessionStartTime(null)
      setWorkoutRecords([])
    }
  }, [
    timerData.timeRemaining,
    hrmData,
    timerData.phase,
    sessionStartTime,
    myClientId,
  ])

  const totalCalories = useMemo(() => {
    if (
      !userSettings.userAge ||
      !userSettings.userWeight ||
      workoutRecords.length === 0
    ) {
      return 0
    }
    return estimateCaloriesBurned({
      age: userSettings.userAge,
      weight: userSettings.userWeight,
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
    const currentUserHr = hrmData.find(
      (user: HrmUser) => user.clientId === myClientId && user.hr !== undefined
    )?.hr

    const otherUsers = hrmData.filter(
      (user) =>
        user.clientId !== myClientId &&
        user.name &&
        !/new user/i.test(user.name)
    )

    // Combine and sort
    return [
      ...(currentUserHr !== undefined
        ? [
            {
              clientId: myClientId || 'unknown',
              name: 'You',
              value: currentUserHr,
              isActive: true,
            },
          ]
        : []),
      ...otherUsers,
    ].sort((a, b) => {
      if (a.name === 'You') return -1
      if (b.name === 'You') return 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [hrmData, myClientId])

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
            <HrTileWrapper user={user as any} />
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
