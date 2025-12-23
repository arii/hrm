// app/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { WorkoutSession } from '../../types/workout'
import Link from 'next/link'

export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/workouts')
        if (!res.ok) {
          throw new Error('Failed to fetch workout sessions')
        }
        const data = await res.json()
        setSessions(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h1>Workout History</h1>
      {sessions.length === 0 ? (
        <p>No workout sessions found.</p>
      ) : (
        <ul>
          {sessions.map((session) => (
            <li key={session.id}>
              <Link href={`/history/${session.id}`}>
                Session at {new Date(session.startTime).toLocaleString()} -{' '}
                {((session.endTime - session.startTime) / 1000).toFixed(2)}{' '}
                seconds
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
