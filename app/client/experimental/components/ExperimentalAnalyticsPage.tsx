// app/client/experimental/components/ExperimentalAnalyticsPage.tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
import { Container, Box, Button } from '@mui/material'
import dynamic from 'next/dynamic'
import { useWebSocket } from '@/context/WebSocketContext'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { useUserSettings } from '@/context/UserSettingsContext'
import { estimateCaloriesBurned } from '@/lib/calorie-estimation'
import { WorkoutSessionData, HrZoneName } from '@/lib/workout-session-storage'

const defaultTimeInZones: Record<HrZoneName, number> = {
  [HrZoneName.WarmUp]: 0,
  [HrZoneName.FatBurn]: 0,
  [HrZoneName.Cardio]: 0,
  [HrZoneName.Peak]: 0,
  [HrZoneName.Max]: 0,
  [HrZoneName.NoData]: 0,
  [HrZoneName.Unknown]: 0,
}

// New components
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
    currentSession: activeSession,
    allSessions,
    startSession: startNewWorkout,
    endSession: endWorkout,
    pauseSession: pauseWorkout,
    resumeSession: resumeWorkout,
    addHrDataPoint: recordDataPoint,
    deleteSession,
  } = useWorkoutSessionManager()

  const [view, setView] = useState<View>(() =>
    activeSession ? 'active' : 'list'
  )
  const [selectedSession, setSelectedSession] =
    useState<WorkoutSessionData | null>(null)

  // Send user metadata when WebSocket connects to ensure this client is registered
  // to receive live HRM data updates. This is crucial for pages that are opened
  // after a connection is already established elsewhere in the application.
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      sendData({
        type: 'HRM_METADATA_UPDATE',
        data: {
          name: userSettings.userName || 'User', // Use a default name if not set
          age: userSettings.userAge || 30, // Use a default age if not set
        },
      })
    }
  }, [connectionStatus, userSettings, sendData])

  // Data recording interval for the active session
  useEffect(() => {
    if (activeSession?.status !== 'running') return

    const intervalId = setInterval(() => {
      const currentHr = hrmData[0]?.value ?? 0 // Gracefully handle no HR data
      const caloriesPerSecond = estimateCaloriesBurned({
        heartRate: currentHr,
        age: userSettings.userAge || 30,
        weightKg: userSettings.userWeight || 70,
        isMale: userSettings.gender === 'MALE',
        durationMinutes: 1 / 60, // Calculate for one second
      })
      recordDataPoint(currentHr, caloriesPerSecond)
    }, 1000)

    return () => clearInterval(intervalId)
  }, [activeSession?.status, hrmData, userSettings, recordDataPoint])

  const handleSelectSession = (session: WorkoutSessionData) => {
    setSelectedSession(session)
    setView('detail')
  }

  const handleBackToList = () => {
    setSelectedSession(null)
    setView('list')
  }

  const handleStartNewWorkout = () => {
    startNewWorkout()
    setView('active')
  }

  const handleEndWorkout = () => {
    endWorkout()
    setView('list')
  }

  // Memoized values for the active session display
  const totalDuration = activeSession?.hrHistory.length ?? 0
  const totalCalories = useMemo(
    () =>
      activeSession?.calorieHistory.reduce(
        (total, dp) => total + dp.calories,
        0
      ) ?? 0,
    [activeSession?.calorieHistory]
  )

  const renderActiveWorkout = () => (
    <Box display="flex" flexDirection="column" gap={3}>
      <WorkoutSummary
        duration={totalDuration}
        calories={totalCalories}
        status={activeSession?.status ?? 'idle'}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <CalorieTracker
            calorieHistory={activeSession?.calorieHistory ?? []}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <ZoneDistribution
            timeInZones={activeSession?.timeInZones ?? defaultTimeInZones}
            userAge={userSettings.userAge}
          />
        </Box>
      </Box>
      <HeartRateTimeSeries hrHistory={activeSession?.hrHistory ?? []} />
      <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
        {activeSession?.status === 'running' && (
          <Button variant="contained" color="warning" onClick={pauseWorkout}>
            Pause
          </Button>
        )}
        {activeSession?.status === 'paused' && (
          <Button variant="contained" color="success" onClick={resumeWorkout}>
            Resume
          </Button>
        )}
        <Button variant="contained" color="primary" onClick={handleEndWorkout}>
          End Workout
        </Button>
      </Box>
    </Box>
  )

  const renderSessionList = () => (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={handleStartNewWorkout}
        sx={{ mb: 3 }}
      >
        Start New Workout
      </Button>
      <SessionList
        sessions={allSessions}
        onSelectSession={handleSelectSession}
        onDeleteSession={deleteSession}
      />
    </>
  )

  const renderSessionDetail = () =>
    selectedSession && (
      <SessionDetail session={selectedSession} onBack={handleBackToList} />
    )

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {view === 'active' && renderActiveWorkout()}
      {view === 'list' && renderSessionList()}
      {view === 'detail' && renderSessionDetail()}
    </Container>
  )
}

export default ExperimentalAnalyticsPage
