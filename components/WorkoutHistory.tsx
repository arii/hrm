'use client'

import { WorkoutRecord } from '@/services/workoutService'
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import DashboardWidget from './widgets/DashboardWidget'

const WorkoutHistory: React.FC = () => {
  const [history, setHistory] = useState<WorkoutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/workouts')
      if (!response.ok) {
        throw new Error('Failed to fetch workout history')
      }
      const data = await response.json()
      setHistory(data)
    } catch (error) {
      setError('An error occurred while fetching workout history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return (
    <DashboardWidget>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Workout History</Typography>
        <Button onClick={fetchHistory} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Refresh'}
        </Button>
      </Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Duration (s)</TableCell>
              <TableCell align="right">Avg HR</TableCell>
              <TableCell align="right">Max HR</TableCell>
              <TableCell align="right">Calories</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((workout) => (
              <TableRow key={workout.id}>
                <TableCell>{new Date(workout.date).toLocaleDateString()}</TableCell>
                <TableCell align="right">{workout.duration.toFixed(0)}</TableCell>
                <TableCell align="right">{workout.avgHr}</TableCell>
                <TableCell align="right">{workout.maxHr}</TableCell>
                <TableCell align="right">{workout.calories}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </DashboardWidget>
  )
}

export default WorkoutHistory
