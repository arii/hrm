// app/client/experimental/components/ExperimentalAnalyticsPage.tsx
'use client'
import { useMemo } from 'react'
import { Container, Box, Button, Chip } from '@mui/material'
import dynamic from 'next/dynamic'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  useLocalWorkoutBuffer,
  ActiveWorkoutInputStatus,
} from '../useLocalWorkoutBuffer'
import WorkoutSummary from './WorkoutSummary'
import ZoneDistribution from './ZoneDistribution'
// Dynamically import HeartRateTimeSeries to ensure it's only rendered client-side
const HeartRateTimeSeries = dynamic(() => import('./HeartRateTimeSeries'), {
  ssr: false,
})
import { estimateCaloriesBurned } from '@/lib/calorie-estimation'
import { useUserSettings } from '@/context/UserSettingsContext'

const ExperimentalAnalyticsPage = () => {
  const { hrmData, timerData } = useWebSocket()
  const timerStatus = timerData?.currentPhase
  const [userSettings] = useUserSettings()

  const workoutStatus: ActiveWorkoutInputStatus =
    timerStatus === 'WORK' || timerStatus === 'REST' ? 'running' : 'idle'

  const { workoutData, resetWorkout, endWorkout } = useLocalWorkoutBuffer(
    hrmData[0]?.value ?? 0,
    workoutStatus
  )

  const totalDuration = workoutData.hrHistory.length

  const caloriesBurned = useMemo(() => {
    return workoutData.hrHistory.reduce((totalCalories, dataPoint) => {
      const calories = estimateCaloriesBurned({
        heartRate: dataPoint.hr,
        age: userSettings.userAge || 30,
        weightKg: userSettings.userWeight || 70,
        durationMinutes: 1 / 60,
      })
      return totalCalories + calories
    }, 0)
  }, [workoutData.hrHistory, userSettings])

  // Determine if the displayed data is from a live session.
  const isLive = workoutStatus === 'running' && workoutData.status === 'running'

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" flexDirection="column" gap={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <WorkoutSummary
            duration={totalDuration}
            calories={caloriesBurned}
            status={workoutData.status}
          />
          <Chip
            label={isLive ? 'Status: Live' : 'Status: Stored'}
            color={isLive ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>
        <Box display="flex" gap={3}>
          <Box flex={1}>
            <ZoneDistribution
              timeInZones={workoutData.timeInZones}
              userAge={userSettings.userAge}
            />
          </Box>
          <Box flex={1}>
            <HeartRateTimeSeries hrHistory={workoutData.hrHistory} />
          </Box>
        </Box>
        <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={endWorkout}
            disabled={
              workoutData.status !== 'running' &&
              workoutData.status !== 'paused'
            }
          >
            End Workout
          </Button>
          <Button variant="outlined" color="secondary" onClick={resetWorkout}>
            Reset Data
          </Button>
        </Box>
      </Box>
    </Container>
  )
}

export default ExperimentalAnalyticsPage
