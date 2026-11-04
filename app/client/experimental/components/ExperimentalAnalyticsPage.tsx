// app/client/experimental/components/ExperimentalAnalyticsPage.tsx
'use client'
import { useEffect, useMemo, useCallback } from 'react'
import { Container, Box, Button } from '@mui/material'
import { useHrmData, useWebSocketConnection } from '@/context/WebSocketContext'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer'
import { useUserSettings } from '@/context/UserSettingsContext'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import { HeartRateZone } from '@/lib/shared/hr-zones'
import { calculateMaxHr } from '@/utils/hrCalculations'
import type { WorkoutStatus } from '@/types/workout'

// Components
import WorkoutSummary from './WorkoutSummary'
import CalorieTracker from './CalorieTracker'
import SessionList from './SessionList'
import SessionDetail from './SessionDetail'
import { HeartRateTimeSeries, ZoneDistribution } from './dynamicCharts'
import { useSessionList } from './useSessionList'
import type { SessionListView } from './useSessionList'
import { useHrRecording } from './useHrRecording'

const defaultTimeInZones: Record<HeartRateZone, number> = {
  ZONE_0: 0,
  ZONE_1: 0,
  ZONE_2: 0,
  ZONE_3: 0,
  ZONE_4: 0,
  ZONE_5: 0,
  ZONE_6: 0,
}

interface SessionSummaryStats {
  avgHr: number
  maxHr: number
  timeInZones: Record<HeartRateZone, number>
  totalCalories: number
}

// Summary stats for the active session view. Pure: unit-tested.
export const computeSummaryStats = (
  activeSession:
    | Pick<WorkoutSessionData, 'hrHistory' | 'timeInZones'>
    | null
    | undefined,
  caloriesBurned: number
): SessionSummaryStats => {
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
    totalCalories: caloriesBurned,
  }
}

const WorkoutStatusActions = ({
  status,
  onStart,
  onPause,
  onResume,
  onEnd,
  onHistory,
}: {
  status: WorkoutStatus
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onEnd: () => void
  onHistory: () => void
}) => (
  <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
    {status === 'idle' && (
      <Button variant="contained" onClick={onStart}>
        Start Workout
      </Button>
    )}
    {status === 'running' && (
      <Button variant="outlined" onClick={onPause}>
        Pause
      </Button>
    )}
    {status === 'paused' && (
      <>
        <Button variant="contained" onClick={onResume}>
          Resume
        </Button>
        <Button variant="outlined" onClick={onEnd}>
          Finish Workout
        </Button>
      </>
    )}
    <Button variant="text" onClick={onHistory}>
      View History
    </Button>
  </Box>
)

interface WorkoutViewActions {
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onEnd: () => void
  onHistory: () => void
}

interface ActiveWorkoutViewProps {
  view: SessionListView
  status: WorkoutStatus
  duration: number
  userName: string
  defaultDate: Date
  summary: SessionSummaryStats
  session: WorkoutSessionData | null
  actions: WorkoutViewActions
}

const ActiveWorkoutView = ({
  view,
  status,
  duration,
  userName,
  defaultDate,
  summary,
  session,
  actions,
}: ActiveWorkoutViewProps) =>
  view === 'active' ? (
    <>
      <WorkoutStatusActions
        status={status}
        onStart={actions.onStart}
        onPause={actions.onPause}
        onResume={actions.onResume}
        onEnd={actions.onEnd}
        onHistory={actions.onHistory}
      />

      <Box sx={{ display: 'grid', gap: 3 }}>
        <WorkoutSummary
          duration={duration}
          calories={summary.totalCalories}
          status={status}
          userName={userName}
          date={session ? new Date(session.startTime) : defaultDate}
        />

        <CalorieTracker calorieHistory={session?.calorieHistory || []} />

        <ZoneDistribution timeInZones={summary.timeInZones} />

        {session && session.hrHistory.length > 0 && (
          <HeartRateTimeSeries hrHistory={session.hrHistory} />
        )}
      </Box>
    </>
  ) : null

interface SessionHistoryViewProps {
  view: SessionListView
  sessions: WorkoutSessionData[]
  hasActiveSession: boolean
  onBackToActive: () => void
  onSelectSession: (session: WorkoutSessionData) => void
  onDeleteSession: (sessionId: string) => void
}

const SessionHistoryView = ({
  view,
  sessions,
  hasActiveSession,
  onBackToActive,
  onSelectSession,
  onDeleteSession,
}: SessionHistoryViewProps) =>
  view === 'list' ? (
    <>
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" onClick={onBackToActive}>
          {hasActiveSession ? 'Back to Active Workout' : 'New Workout'}
        </Button>
      </Box>
      <SessionList
        sessions={sessions}
        onSelectSession={onSelectSession}
        onDeleteSession={onDeleteSession}
      />
    </>
  ) : null

interface SessionDetailViewProps {
  view: SessionListView
  session: WorkoutSessionData | null
  onBack: () => void
}

const SessionDetailView = ({
  view,
  session,
  onBack,
}: SessionDetailViewProps) =>
  view === 'detail' && session ? (
    <SessionDetail session={session} onBack={onBack} />
  ) : null

const ExperimentalAnalyticsPage = () => {
  const hrmData = useHrmData()
  const { sendData, connectionStatus } = useWebSocketConnection()
  const [userSettings] = useUserSettings()

  // Use #5110's hooks
  const {
    session: activeSession,
    status,
    isInitialized,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    addHrData,
    caloriesBurned,
  } = useWorkoutSessionManager()

  const duration = useWorkoutTimer(
    status,
    activeSession?.startTime,
    activeSession?.totalPaused,
    activeSession?.pauseTime,
    activeSession?.endTime
  )

  // Session list management lives in its own hook; the page keeps the
  // recording lifecycle, metadata sync, and rendering.
  const {
    allSessions,
    view,
    setView,
    selectedSession,
    handleViewSession,
    handleDeleteSession,
    handleBackToList,
  } = useSessionList({
    isInitialized,
    activeSessionEndTime: activeSession?.endTime,
    status,
    initialView: activeSession ? 'active' : 'list',
  })

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

  // One sample per second while running; the ref mirror keeps the
  // interval stable across HR updates (see hook).
  useHrRecording(status, hrmData, addHrData)

  // Handlers
  const handleStartWorkout = useCallback(() => {
    const age = userSettings.userAge || 30
    const weight = userSettings.userWeight || 70
    const maxHr = calculateMaxHr(age)

    startWorkout(age, weight, { maxHr })
    setView('active')
    // setView is the hook's stable useState setter; listed for exhaustive-deps.
  }, [startWorkout, userSettings, setView])

  const handlePauseWorkout = useCallback(() => {
    pauseWorkout()
  }, [pauseWorkout])

  const handleResumeWorkout = useCallback(() => {
    resumeWorkout()
  }, [resumeWorkout])

  const handleEndWorkout = useCallback(() => {
    endWorkout()
  }, [endWorkout])

  // Compute summary stats
  const summaryData = useMemo(
    () => computeSummaryStats(activeSession, caloriesBurned),
    [activeSession, caloriesBurned]
  )

  const defaultDate = useMemo(() => new Date(), [])

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} data-testid="dashboard">
      <ActiveWorkoutView
        view={view}
        status={status}
        duration={duration}
        userName={userSettings.userName || 'Guest User'}
        defaultDate={defaultDate}
        summary={summaryData}
        session={activeSession}
        actions={{
          onStart: handleStartWorkout,
          onPause: handlePauseWorkout,
          onResume: handleResumeWorkout,
          onEnd: handleEndWorkout,
          onHistory: () => setView('list'),
        }}
      />
      <SessionHistoryView
        view={view}
        sessions={allSessions}
        hasActiveSession={!!activeSession}
        onBackToActive={() => setView('active')}
        onSelectSession={handleViewSession}
        onDeleteSession={handleDeleteSession}
      />
      <SessionDetailView
        view={view}
        session={selectedSession}
        onBack={handleBackToList}
      />
    </Container>
  )
}

export default ExperimentalAnalyticsPage
