// app/client/experimental/components/WorkoutSummary.tsx
'use client'
import { Card, CardContent, Typography, Box } from '@mui/material'
import { formatDuration } from '@/lib/utils'

interface WorkoutSummaryProps {
  duration: number
  calories: number
  status: 'idle' | 'running' | 'paused' | 'finished'
}

const WorkoutSummary = ({
  duration,
  calories,
  status,
}: WorkoutSummaryProps) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Workout Summary
        </Typography>
        <Box display="flex" flexWrap="wrap" mx={-1}>
          <Box width="50%" p={1}>
            <Typography variant="h6">Status</Typography>
            <Typography variant="body1">{status}</Typography>
          </Box>
          <Box width="50%" p={1}>
            <Typography variant="h6">Duration</Typography>
            <Typography variant="body1">
              {formatDuration(duration, { unit: 'seconds' })}
            </Typography>
          </Box>
          <Box width="50%" p={1}>
            <Typography variant="h6">Calories Burned</Typography>
            <Typography variant="body1">{calories.toFixed(2)}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default WorkoutSummary
