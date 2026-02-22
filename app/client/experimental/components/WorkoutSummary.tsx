// app/client/experimental/components/WorkoutSummary.tsx
'use client'

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  useTheme,
  Grid,
} from '@mui/material'
import {
  AccessTime as TimeIcon,
  LocalFireDepartment as BurnIcon,
  Person as PersonIcon,
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

  const formattedDate = formatDate(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const statusColor =
    theme.palette.custom?.[status] || theme.palette.text.secondary

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
              sx={{ opacity: 0.8, letterSpacing: 1 }}
            >
              HRM Session
            </Typography>
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PersonIcon fontSize="small" aria-hidden="true" /> {userName}
            </Typography>
          </Box>
          <Chip
            label={status.toUpperCase()}
            sx={{
              fontWeight: 'bold',
              bgcolor: 'white',
              color: statusColor,
            }}
          />
        </Stack>
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 1, opacity: 0.9 }}
        >
          {formattedDate}
        </Typography>
      </Box>

      <CardContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 6 }}>
            <Box textAlign="center">
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
              <Typography variant="h4" component="p" fontWeight={700}>
                {formatDuration(duration, {
                  unit: 'seconds',
                  format: 'HH:MM:SS',
                })}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 6 }}>
            <Box textAlign="center">
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
                fontWeight={700}
                color={calories > 0 ? 'error.main' : 'text.primary'}
              >
                {calories.toFixed(1)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default WorkoutSummary
