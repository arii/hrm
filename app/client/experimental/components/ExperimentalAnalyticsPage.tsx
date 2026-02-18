// app/client/experimental/components/ExperimentalAnalyticsPage.tsx
'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Container, Box, Button } from '@mui/material'
import dynamic from 'next/dynamic'
import { useWebSocket } from '@/context/WebSocketContext'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { useCalorieTracker } from '@/hooks/useCalorieTracker'
import { useUserSettings } from '@/context/UserSettingsContext'
import {
  workoutSessionStorage,
  WorkoutSessionData,
} from '@/lib/workout-session-storage'
import { HeartRateZone, calculateMaxHr } from '@/lib/shared/hr-zones'

const defaultTimeInZones: Record<HeartRateZone, number> = {
  ZONE_0: 0,
  ZONE_1: 0,
  ZONE_2: 0,
  ZONE_3: 0,
  ZONE_4: 0,
  ZONE_5: 0,
  ZONE_6: 0,
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

  // Use #5110's hooks
  const {
    session: activeSession,
    status,
    isInitialized,
    duration,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    addHrData,
    updateCalories,
  } = useWorkoutSessionManager()

  const {
    processHeartRate,
    totalCaloriesBurned,
    calorieHistory,
    reset: resetCalories,
    setCalories: setTrackerCalories,
  } = useCalorieTracker({
    age: userSettings.userAge || 30,
    weightKg: userSettings.userWeight || 70,
  })

  // Session list management (direct storage access)
  const [allSessions, setAllSessions] = useState<WorkoutSessionData[]>([])
  const [view, setView] = useState<View>(() =>
    activeSession ? 'active' : 'list'
  )
  const [selectedSession, setSelectedSession] =
    useState<WorkoutSessionData | null>(null)

  // State for test readiness
  const [isReady, setIsReady] = useState(false)

  // Load all sessions
  useEffect(() => {
    const loadSessions = async () => {
      const sessions = await workoutSessionStorage.getAllSessions()
      setAllSessions(sessions.sort((a, b) => b.startTime - a.startTime))
    }
    if (isInitialized) {
      loadSessions()
    }
  }, [isInitialized, activeSession?.endTime]) // Reload when session ends

  // Effect to handle the end of a workout session
  useEffect(() => {
    if (status === 'finished') {
      const reloadSessions = async () => {
        const sessions = await workoutSessionStorage.getAllSessions()
        setAllSessions(sessions.sort((a, b) => b.startTime - a.startTime))
        setView('list')
      }
      reloadSessions()
    }
  }, [status])

  // Send user metadata when WebSocket connects
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      const age = userSettings.userAge || 30
      const maxHr = calculateMaxHr(age)
      sendData({
        type: 'HRM_METADATA_UPDATE',
        data: {
          age,
          maxHr,
        },
      })
    }
  }, [connectionStatus, userSettings, sendData])

  // Signal when page is ready for testing
  useEffect(() => {
    setIsReady(true)
  }, [])

  /**
   * FIX: Use ref to avoid interval reset on HR updates (addresses audit issue #1)
   * This prevents the interval from being recreated on every hrmData change
   */
  const latestHrRef = useRef(0)

  useEffect(() => {
    latestHrRef.current = hrmData[0]?.value ?? 0
  }, [hrmData])

  // Recording interval - only depends on status, not hrmData
  useEffect(() => {
    if (status !== 'running') return

    const intervalId = setInterval(() => {
      const currentHr = latestHrRef.current

      // Process calories (uses time-gap validation internally)
      processHeartRate(currentHr)

      // Add HR data point with zone calculation
      const dataPoint = {
        time: Date.now(),
        hr: currentHr,
      }

      addHrData(dataPoint)
    }, 1000)

    return () => clearInterval(intervalId)
  }, [status, processHeartRate, addHrData])

  // Sync calories to session manager
  useEffect(() => {
    if (isInitialized) {
      updateCalories(totalCaloriesBurned)
    }
  }, [totalCaloriesBurned, updateCalories, isInitialized])

  // Restore tracker state from recovered session
  useEffect(() => {
    if (isInitialized && activeSession?.totalCaloriesBurned) {
      setTrackerCalories(activeSession.totalCaloriesBurned)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized])

  // Handlers
  const handleStartWorkout = useCallback(() => {
    const age = userSettings.userAge || 30
    const weight = userSettings.userWeight || 70
    const maxHr = calculateMaxHr(age)
    resetCalories()
    startWorkout(age, weight, { maxHr, startCalories: 0 })
    setView('active')
  }, [startWorkout, resetCalories, userSettings])

  const handlePauseWorkout = useCallback(() => {
    pauseWorkout()
  }, [pauseWorkout])

  const handleResumeWorkout = useCallback(() => {
    resumeWorkout()
  }, [resumeWorkout])

  const handleEndWorkout = useCallback(() => {
    endWorkout()
  }, [endWorkout])

  const handleViewSession = useCallback((session: WorkoutSessionData) => {
    setSelectedSession(session)
    setView('detail')
  }, [])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await workoutSessionStorage.deleteSession(sessionId)
    const sessions = await workoutSessionStorage.getAllSessions()
    setAllSessions(sessions.sort((a, b) => b.startTime - a.startTime))
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedSession(null)
    setView('list')
  }, [])

  // Compute summary stats
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

  const defaultDate = useMemo(() => new Date(), [])

  return (
    <Container
      maxWidth="lg"
      sx={{ mt: 4, mb: 4 }}
      data-testid="dashboard"
      data-ready={isReady ? 'true' : undefined}
    >
      {view === 'active' && (
        <>
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            {status === 'idle' && (
              <Button variant="contained" onClick={handleStartWorkout}>
                Start Workout
              </Button>
            )}
            {status === 'running' && (
              <Button variant="outlined" onClick={handlePauseWorkout}>
                Pause
              </Button>
            )}
            {status === 'paused' && (
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
              duration={duration}
              calories={summaryData.totalCalories}
              status={status}
              userName={userSettings.userName || 'Guest User'}
              date={
                activeSession ? new Date(activeSession.startTime) : defaultDate
              }
            />

            <CalorieTracker calorieHistory={calorieHistory} />

            <ZoneDistribution
              timeInZones={summaryData.timeInZones}
              totalDuration={duration}
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
              {activeSession ? 'Back to Active Workout' : 'New Workout'}
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
