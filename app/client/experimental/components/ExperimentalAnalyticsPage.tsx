'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Container, Box, Button } from '@mui/material'
import dynamic from 'next/dynamic'
import { useWebSocket } from '@/context/WebSocketContext'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useCalorieTracker } from '@/hooks/useCalorieTracker'
import { useUserSettings } from '@/context/UserSettingsContext'
import {
  workoutSessionStorage,
  WorkoutSessionData,
} from '@/lib/workout-session-storage'
import { HrZoneName } from '@/lib/shared/hr-zones'

const defaultTimeInZones: Record<HrZoneName, number> = {
  [HrZoneName.WarmUp]: 0,
  [HrZoneName.FatBurn]: 0,
  [HrZoneName.Cardio]: 0,
  [HrZoneName.Peak]: 0,
  [HrZoneName.Max]: 0,
  [HrZoneName.NoData]: 0,
  [HrZoneName.Unknown]: 0,
}

// Components
import WorkoutSummary from './WorkoutSummary'
import ZoneDistribution from './ZoneDistribution'
import CalorieTracker from './CalorieTracker'
import SessionList from './SessionList'
import SessionDetail from './SessionDetail'

const HeartRateTimeSeries = dynamic(() => import('./HeartRateTimeSeries'), {
  ssr: false,
})

type View = 'active' | 'list' | 'detail'

const ExperimentalAnalyticsPage = () => {
  const { hrmData, sendData, connectionStatus } = useWebSocket()
  const [userSettings] = useUserSettings()

  const {
    processHeartRate,
    totalCaloriesBurned,
    calorieHistory,
    reset: resetCalories,
  } = useCalorieTracker({
    age: userSettings.userAge || 30,
    weightKg: userSettings.userWeight || 70,
  })

  const {
    workoutDuration,
    startWorkout,
    pauseWorkout,
    endWorkout,
    addHrData,
    workoutStatus,
    currentSession,
  } = useWorkoutSession({
    totalCalories: totalCaloriesBurned,
    userAge: userSettings.userAge || 30,
    userWeight: userSettings.userWeight || 70,
  })

  const activeSession = currentSession
  const [allSessions, setAllSessions] = useState<WorkoutSessionData[]>([])
  const [view, setView] = useState<View>(() =>
    workoutStatus !== 'idle' ? 'active' : 'list'
  )
  const [selectedSession, setSelectedSession] =
    useState<WorkoutSessionData | null>(null)

  const loadSessions = useCallback(async () => {
    const sessions = await workoutSessionStorage.getAllSessions()
    setAllSessions(sessions.sort((a, b) => b.startTime - a.startTime))
  }, [])

  useEffect(() => {
    if (workoutStatus !== 'idle') {
      setTimeout(
        () => setView((prev) => (prev !== 'active' ? 'active' : prev)),
        0
      )
    }
  }, [workoutStatus])


  useEffect(() => {
    // Load sessions asynchronously
    // Wrapped in setTimeout to satisfy linter rule about sync state updates in effect
    setTimeout(() => {
      loadSessions().catch((err) =>
        console.error('Failed to load sessions:', err)
      )
    }, 0)
  }, [loadSessions, workoutStatus])

  useEffect(() => {
    if (connectionStatus === 'Connected') {
      const age = userSettings.userAge || 30
      const maxHr = 220 - age
      sendData({
        type: 'HRM_METADATA_UPDATE',
        data: {
          age,
          maxHr,
        },
      })
    }
  }, [connectionStatus, userSettings, sendData])

  const latestHrRef = useRef(0)

  useEffect(() => {
    latestHrRef.current = hrmData[0]?.value ?? 0
  }, [hrmData])

  useEffect(() => {
    if (workoutStatus !== 'running') return

    const intervalId = setInterval(() => {
      const currentHr = latestHrRef.current
      processHeartRate(currentHr)
      addHrData(currentHr)
    }, 1000)

    return () => clearInterval(intervalId)
  }, [workoutStatus, processHeartRate, addHrData])

  const handleStartWorkout = useCallback(() => {
    startWorkout()
    resetCalories()
    setView('active')
  }, [startWorkout, resetCalories])

  const handleResumeWorkout = useCallback(() => {
    startWorkout()
  }, [startWorkout])

  const handlePauseWorkout = useCallback(() => {
    pauseWorkout()
  }, [pauseWorkout])

  const handleEndWorkout = useCallback(() => {
    endWorkout()
  }, [endWorkout])

  const handleViewSession = useCallback((session: WorkoutSessionData) => {
    setSelectedSession(session)
    setView('detail')
  }, [])

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await workoutSessionStorage.deleteSession(sessionId)
      loadSessions()
    },
    [loadSessions]
  )

  const handleBackToList = useCallback(() => {
    setSelectedSession(null)
    setView('list')
  }, [])

  const summaryData = useMemo(() => {
    if (!activeSession)
      return {
        avgHr: 0,
        maxHr: 0,
        timeInZones: defaultTimeInZones,
        totalCalories: 0,
      }

    const hrValues = activeSession.hrHistory
      .map((d) => d.hr)
      .filter((hr) => hr > 0)
    const avgHr =
      hrValues.length > 0
        ? hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length
        : 0
    const maxHr = hrValues.length > 0 ? Math.max(...hrValues) : 0

    return {
      avgHr,
      maxHr,
      timeInZones: activeSession.timeInZones,
      totalCalories: totalCaloriesBurned,
    }
  }, [activeSession, totalCaloriesBurned])

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} data-testid="dashboard">
      {view === 'active' && (
        <>
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            {workoutStatus === 'idle' && (
              <Button variant="contained" onClick={handleStartWorkout}>
                Start Workout
              </Button>
            )}
            {workoutStatus === 'running' && (
              <Button variant="outlined" onClick={handlePauseWorkout}>
                Pause
              </Button>
            )}
            {workoutStatus === 'paused' && (
              <>
                <Button variant="contained" onClick={handleResumeWorkout}>
                  Resume
                </Button>
                <Button variant="outlined" onClick={handleEndWorkout}>
                  Finish Workout
                </Button>
              </>
            )}
            <Button variant="text" onClick={() => setView('list')}>
              View History
            </Button>
          </Box>

          <Box sx={{ display: 'grid', gap: 3 }}>
            <WorkoutSummary
              duration={workoutDuration}
              calories={summaryData.totalCalories}
              status={workoutStatus}
            />

            <CalorieTracker calorieHistory={calorieHistory} />

            <ZoneDistribution
              timeInZones={
                summaryData.timeInZones as Record<HrZoneName, number>
              }
              totalDuration={workoutDuration}
            />

            {activeSession && activeSession.hrHistory.length > 0 && (
              <HeartRateTimeSeries hrHistory={activeSession.hrHistory} />
            )}
          </Box>
        </>
      )}

      {view === 'list' && (
        <>
          <Box sx={{ mb: 3 }}>
            <Button variant="contained" onClick={() => setView('active')}>
              {workoutStatus !== 'idle'
                ? 'Back to Active Workout'
                : 'New Workout'}
            </Button>
          </Box>
          <SessionList
            sessions={allSessions}
            onSelectSession={handleViewSession}
            onDeleteSession={handleDeleteSession}
          />
        </>
      )}

      {view === 'detail' && selectedSession && (
        <SessionDetail session={selectedSession} onBack={handleBackToList} />
      )}
    </Container>
  )
}

export default ExperimentalAnalyticsPage
