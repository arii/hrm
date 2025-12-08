// File: components/WorkoutHistory.tsx
'use client'
import { useEffect, useState } from 'react'
import DashboardWidget from './widgets/DashboardWidget'
import DataWidget from './widgets/DataWidget'
import { WorkoutStats } from '@/services/HeartRateService'
import Box from '@mui/material/Box'

const WorkoutHistory = () => {
  const [history, setHistory] = useState<WorkoutStats[]>([])

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch('/api/workouts')
      const data = await res.json()
      setHistory(data)
    }
    fetchHistory()
  }, [])

  return (
    <DashboardWidget title="Workout History">
      <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
        {history.map((workout, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <DataWidget
              label="Date"
              value={new Date(workout.date).toLocaleDateString()}
            />
            <DataWidget
              label="Duration"
              value={`${Math.round(workout.duration / 60)} mins`}
            />
            <DataWidget label="Avg HR" value={`${workout.averageHr} bpm`} />
            <DataWidget label="Calories" value={workout.caloriesBurned} />
          </Box>
        ))}
      </Box>
    </DashboardWidget>
  )
}

export default WorkoutHistory
