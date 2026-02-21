'use client'

import { Card, CardContent, Typography, Box, Chip, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Grid from '@mui/material/Grid'
import {
  AccessTime as TimeIcon,
  LocalFireDepartment as BurnIcon,
} from '@mui/icons-material'
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

  // Use a safe fallback for custom status colors
  const statusColor =
    (theme.palette as unknown as { custom?: Record<string, string> }).custom?.[
      status
    ] ||
    (status === 'running'
      ? theme.palette.success.main
      : theme.palette.grey[500])

  const formattedDate = formatDate(date)

  return (
    <Card
      data-testid="workout-summary"
      elevation={4}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: 2,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ opacity: 0.8, letterSpacing: 1, display: 'block' }}
            >
              Workout Summary
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {userName || 'Guest User'} • {formattedDate}
            </Typography>
          </Box>
          <Chip
            label={status.toUpperCase()}
            sx={{
              fontWeight: 'bold',
              bgcolor: statusColor,
              color: 'white',
              border: 'none',
            }}
          />
        </Stack>
      </Box>

      <CardContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }} sx={{ textAlign: 'center' }}>
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              gap={1}
              mb={0.5}
            >
              <TimeIcon color="action" fontSize="small" aria-hidden="true" />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
              >
                DURATION
              </Typography>
            </Stack>
            <Typography
              variant="h4"
              component="p"
              sx={{
                fontWeight: 700,
              }}
            >
              {formatDuration(duration, {
                unit: 'seconds',
                format: 'HH:MM:SS',
              })}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }} sx={{ textAlign: 'center' }}>
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              gap={1}
              mb={0.5}
            >
              <BurnIcon color="error" fontSize="small" aria-hidden="true" />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
              >
                CALORIES
              </Typography>
            </Stack>
            <Typography
              variant="h4"
              component="p"
              sx={{
                color: calories > 0 ? 'error.main' : 'text.primary',
                fontWeight: 700,
              }}
            >
              {calories.toFixed(0)}{' '}
              <Typography component="span" variant="caption">
                kcal
              </Typography>
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default WorkoutSummary
