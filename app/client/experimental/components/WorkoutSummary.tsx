// app/client/experimental/components/WorkoutSummary.tsx
'use client'
import { Card, CardContent, Typography, Box, Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
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
  const theme = useTheme()

  const statusColors = {
    idle: theme.palette.custom.idle,
    running: theme.palette.custom.running,
    paused: theme.palette.custom.prepare,
    finished: theme.palette.custom.cooldown,
  }

  const statusColor = statusColors[status] || theme.palette.custom.idle

  return (
    <Card elevation={2} data-testid="workout-summary">
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6" fontWeight="bold">
            Workout Summary
          </Typography>
          <Chip
            label={status.toUpperCase()}
            sx={{
              backgroundColor: statusColor,
              color: '#fff',
              fontWeight: 'bold',
            }}
          />
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Box>
            <Typography variant="caption" color="textSecondary">
              Duration
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: 'Monospace' }}>
              {formatDuration(duration, {
                unit: 'seconds',
                format: 'HH:MM:SS',
              })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Calories
            </Typography>
            <Typography variant="h5">
              {calories.toFixed(0)} <small>kcal</small>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default WorkoutSummary
