'use client'

import { Card, CardContent, Typography, Box, Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Grid from '@mui/material/Grid'
import { formatDuration, formatDate } from '@/lib/utils'

interface WorkoutSummaryProps {
  duration: number
  calories: number
  status: 'idle' | 'running' | 'paused' | 'finished'
  userName: string
  date: Date
}

const WorkoutSummary = ({
  duration,
  calories,
  status,
  userName,
  date,
}: WorkoutSummaryProps) => {
  const theme = useTheme()

  // Map status to theme colors defined in theme.ts
  const statusColor = theme.palette.custom[status] || '#ccc'

  return (
    <Card elevation={2} data-testid="workout-summary">
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Workout Summary
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {userName} • {formatDate(date)}
            </Typography>
          </Box>
          <Chip
            label={status.toUpperCase()}
            sx={{
              backgroundColor: statusColor,
              color: '#fff',
              fontWeight: 'bold',
            }}
          />
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="textSecondary">
              Duration
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: 'Monospace' }}>
              {formatDuration(duration, {
                unit: 'seconds',
                format: 'HH:MM:SS',
              })}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="textSecondary">
              Calories
            </Typography>
            <Typography variant="h5">
              {calories.toFixed(0)} <small>kcal</small>
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default WorkoutSummary
