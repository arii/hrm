// components/WorkoutGrid.tsx
'use client'

import { useEffect, useState } from 'react'
import { CircularProgress, Alert, Box, Typography } from '@mui/material'
import WorkoutCard from './WorkoutCard'
import { getIconForExercise } from '../utils/workout-helpers'

interface WorkoutData {
  headers: string[]
  rows: string[][]
}

interface WorkoutTableViewerProps {
  docId: string
}

export default function WorkoutGrid({ docId }: WorkoutTableViewerProps) {
  const [data, setData] = useState<WorkoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<boolean[]>([])

  // Load completion state from localStorage on initial render
  useEffect(() => {
    try {
      const storedCompleted = localStorage.getItem('workoutCompleted')
      if (storedCompleted) {
        setCompleted(JSON.parse(storedCompleted))
      }
    } catch (error) {
      console.error('Failed to parse workout completion state:', error)
      // If parsing fails, start with a clean slate
      setCompleted([])
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/workout?docId=${docId}`)
        if (!res.ok) throw new Error('Failed to load workout data')
        const json = await res.json()
        setData(json)
        // Only initialize if not already loaded from localStorage
        if (completed.length !== json.rows.length) {
          setCompleted(new Array(json.rows.length).fill(false))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (docId) {
      fetchData()
    }
  }, [docId])

  const handleToggleComplete = (index: number) => {
    setCompleted((prev) => {
      const newCompleted = [...prev]
      newCompleted[index] = !newCompleted[index]
      try {
        localStorage.setItem(
          'workoutCompleted',
          JSON.stringify(newCompleted)
        )
      } catch (error) {
        console.error('Failed to save workout completion state:', error)
      }
      return newCompleted
    })
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!data || data.rows.length === 0) {
    return <Alert severity="info">No workout data found.</Alert>
  }

  const HEADER_EXERCISE = 'exercise'
  const HEADER_NOTES = 'notes'

  const exerciseNameIndex = data.headers.findIndex(
    (h) => h.toLowerCase() === HEADER_EXERCISE
  )
  const detailsIndex = data.headers.findIndex(
    (h) => h.toLowerCase() === HEADER_NOTES
  )

  return (
    <Box>
      <Typography variant="h4" component="h2" gutterBottom>
        Today&apos;s Workout
      </Typography>
      <Box display="flex" flexWrap="wrap" sx={{ mx: -1 }}>
        {data.rows.map((row, rowIndex) => {
          const exerciseName =
            (exerciseNameIndex !== -1 && row[exerciseNameIndex]) || 'Exercise'
          const details =
            (detailsIndex !== -1 && row[detailsIndex]) || row.join(', ')

          return (
            <Box
              key={rowIndex}
              sx={{
                p: 1,
                width: {
                  xs: '100%',
                  sm: '50%',
                  md: '33.33%',
                },
              }}
            >
              <WorkoutCard
                exerciseName={exerciseName}
                details={details}
                isCompleted={completed[rowIndex] || false}
                onToggleComplete={() => handleToggleComplete(rowIndex)}
                icon={getIconForExercise(exerciseName)}
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
