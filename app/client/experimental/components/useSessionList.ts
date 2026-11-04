// Session-list management for the experimental analytics page: loading,
// finish-triggered reload, selection, deletion, and view routing.
// Extracted from ExperimentalAnalyticsPage to isolate the list concern.
'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  workoutSessionStorage,
  WorkoutSessionData,
} from '@/lib/workout-session-storage'
import type { WorkoutStatus } from '@/types/workout'

export type SessionListView = 'active' | 'list' | 'detail'

// Newest-first session fetch shared by the init/end effects and delete
// handler (previously three copies of fetch + sort). State updates stay
// at the call sites (promise callbacks), never inside effects directly.
const fetchSessionsNewestFirst = async (): Promise<WorkoutSessionData[]> => {
  const sessions = await workoutSessionStorage.getAllSessions()
  return sessions.sort((a, b) => b.startTime - a.startTime)
}

export const useSessionList = ({
  isInitialized,
  activeSessionEndTime,
  status,
  initialView,
}: {
  isInitialized: boolean
  activeSessionEndTime: number | null | undefined
  status: WorkoutStatus
  initialView: SessionListView
}) => {
  const [allSessions, setAllSessions] = useState<WorkoutSessionData[]>([])
  const [view, setView] = useState<SessionListView>(initialView)
  const [selectedSession, setSelectedSession] =
    useState<WorkoutSessionData | null>(null)

  // Load all sessions
  useEffect(() => {
    if (isInitialized) {
      fetchSessionsNewestFirst().then((sessions) => setAllSessions(sessions))
    }
  }, [isInitialized, activeSessionEndTime]) // Reload when session ends

  // Effect to handle the end of a workout session
  useEffect(() => {
    if (status === 'finished') {
      fetchSessionsNewestFirst().then((sessions) => {
        setAllSessions(sessions)
        setView('list')
      })
    }
  }, [status])

  const handleViewSession = useCallback((session: WorkoutSessionData) => {
    setSelectedSession(session)
    setView('detail')
  }, [])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await workoutSessionStorage.deleteSession(sessionId)
    setAllSessions(await fetchSessionsNewestFirst())
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedSession(null)
    setView('list')
  }, [])

  return {
    allSessions,
    view,
    setView,
    selectedSession,
    handleViewSession,
    handleDeleteSession,
    handleBackToList,
  }
}
