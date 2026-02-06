// app/client/experimental/components/ExperimentalAnalyticsPage.tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
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
    sessionId,
    workoutStatus: status,
    workoutDuration: duration,
    startWorkout,
    pauseWorkout,
    endWorkout,
    addHrData,
    timeInZones,
    averageHr,
    maxHr: currentMaxHr,
    caloriesBurned,
  } = useWorkoutSession({
    userAge: userSettings.userAge || 30,
    userWeight: userSettings.userWeight || 70,
  })

  // Local state for historical sessions
  const [activeSessionHistory, setActiveSessionHistory] = useState<
    { time: number; hr: number }[]
  >([])

  // Load history if resuming a session (optional enhancement, skipping complex merge for now)
  // For now, we visualize what's in memory or just current stream.
  // Ideally, we'd load the full history from IDB on mount if session exists.

  const { processHeartRate, calorieHistory, reset } = useCalorieTracker({
    age: userSettings.userAge || 30,
    weightKg: userSettings.userWeight || 70,
  })

  // Session list management (direct storage access)
  const [allSessions, setAllSessions] = useState<WorkoutSessionData[]>([])
  // view state initialization based on sessionId existence
  const [view, setView] = useState<View>(() => (sessionId ? 'active' : 'list'))
  const [selectedSession, setSelectedSession] =
    useState<WorkoutSessionData | null>(null)

  // Load all sessions
  useEffect(() => {
    const loadSessions = async () => {
      const sessions = await workoutSessionStorage.getAllSessions()
      setAllSessions(sessions.sort((a, b) => b.startTime - a.startTime))
    }
    loadSessions()
  }, [sessionId]) // Reload when session ID changes (start/end)

  // Effect to handle the end of a workout session
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    if (status === 'idle' && !sessionId && view === 'active') {
      // Use setTimeout to avoid set-state-in-effect warning
      timeoutId = setTimeout(() => {
        setView('list')
      }, 0)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [status, sessionId, view])

  // Send user metadata when WebSocket connects
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      const age = userSettings.userAge || 30
      const maxHr = 220 - age // Simple formula for max HR
      sendData({
        type: 'HRM_METADATA_UPDATE',
        data: {
          age,
          maxHr,
        },
      })
    }
  }, [connectionStatus, userSettings, sendData])

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

      // Add HR data point
      // useWorkoutSession.addHrData expects number
      addHrData(currentHr)

      // Update local history for chart (simplified)
      if (currentHr > 0) {
        setActiveSessionHistory((prev) => [
          ...prev,
          { time: Date.now(), hr: currentHr },
        ])
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [status, processHeartRate, addHrData])

  // Handlers
  const handleStartWorkout = useCallback(() => {
    startWorkout() // No args
    reset()
    setActiveSessionHistory([])
    setView('active')
  }, [startWorkout, reset])

  const handleResumeWorkout = useCallback(() => {
    startWorkout() // startWorkout handles resume if paused
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

  const handleDeleteSession = useCallback(async (sid: string) => {
    await workoutSessionStorage.deleteSession(sid)
    const sessions = await workoutSessionStorage.getAllSessions()
    setAllSessions(sessions.sort((a, b) => b.startTime - a.startTime))
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedSession(null)
    setView('list')
  }, [])

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} data-testid="dashboard">
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
              calories={caloriesBurned}
              status={status}
            />

            <CalorieTracker calorieHistory={calorieHistory} />

            <ZoneDistribution
              timeInZones={timeInZones}
              totalDuration={duration}
            />

            {/* Displaying chart for current session */}
            {activeSessionHistory.length > 0 && (
              <HeartRateTimeSeries hrHistory={activeSessionHistory} />
            )}

            {/* Stats display */}
            <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
              <div>
                <strong>Avg HR:</strong> {Math.round(averageHr)} BPM
              </div>
              <div>
                <strong>Max HR:</strong> {currentMaxHr} BPM
              </div>
            </Box>
          </Box>
        </>
      )}

      {view === 'list' && (
        <>
          <Box sx={{ mb: 3 }}>
            <Button variant="contained" onClick={() => setView('active')}>
              {sessionId ? 'Back to Active Workout' : 'New Workout'}
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
