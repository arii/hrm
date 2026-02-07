// app/client/experimental/components/ExperimentalAnalyticsPage.tsx
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
    sessionId,
    workoutStatus: status,
    workoutDuration: duration,
    startWorkout,
    pauseWorkout,
    endWorkout,
    addHrData,
  } = useWorkoutSession({
    userAge: userSettings.userAge || 30,
    userWeight: userSettings.userWeight || 70,
  })

  // Local state for active session data (loaded from storage)
  const [activeSession, setActiveSession] = useState<WorkoutSessionData | null>(
    null
  )

  // Effect to handle session fetching and polling
  useEffect(() => {
    let isActive = true

    if (sessionId) {
      const fetchSession = async () => {
        try {
          const s = await workoutSessionStorage.getSession(sessionId)
          if (isActive) setActiveSession(s)
        } catch (e) {
          console.error('Failed to load active session', e)
        }
      }

      fetchSession()
      // Poll for updates (e.g. every 5 seconds)
      const id = setInterval(fetchSession, 5000)
      return () => {
        isActive = false
        clearInterval(id)
      }
    } else if (activeSession) {
      // Wrap in setTimeout to avoid "synchronous setState in effect" warning
      // This is safe here because we are intentionally deferring the clear operation
      const t = setTimeout(() => setActiveSession(null), 0)
      return () => clearTimeout(t)
    }
    return undefined // Explicit return for paths where no cleanup is needed
  }, [sessionId, activeSession])

  const { processHeartRate, totalCaloriesBurned, calorieHistory, reset } =
    useCalorieTracker({
      age: userSettings.userAge || 30,
      weightKg: userSettings.userWeight || 70,
    })

  // Session list management (direct storage access)
  const [allSessions, setAllSessions] = useState<WorkoutSessionData[]>([])
  const [view, setView] = useState<View>(() => (sessionId ? 'active' : 'list'))
  const [selectedSession, setSelectedSession] =
    useState<WorkoutSessionData | null>(null)

  // Load all sessions
  useEffect(() => {
    const loadSessions = async () => {
      const sessions = await workoutSessionStorage.getAllSessions()
      setAllSessions(sessions.sort((a, b) => b.startTime - a.startTime))
    }
    // Load initially and when active session changes (ends)
    loadSessions()
  }, [sessionId]) // Reload when session ID changes (start/end)

  // Effect to handle the end of a workout session
  useEffect(() => {
    if (status === 'idle') {
      const reloadSessions = async () => {
        const sessions = await workoutSessionStorage.getAllSessions()
        setAllSessions(sessions.sort((a, b) => b.startTime - a.startTime))
        // If we were viewing active, switch to list
        if (view === 'active') {
          setView('list')
        }
      }
      reloadSessions()
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
    }, 1000)

    return () => clearInterval(intervalId)
  }, [status, processHeartRate, addHrData])

  // Handlers
  const handleStartWorkout = useCallback(() => {
    startWorkout() // No args
    reset()
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
              calories={summaryData.totalCalories}
              status={status}
            />

            <CalorieTracker calorieHistory={calorieHistory} />

            <ZoneDistribution
              timeInZones={
                summaryData.timeInZones as Record<HrZoneName, number>
              }
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
