'use client'

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  Stack,
  useTheme,
} from '@mui/material'
import {
  AccessTime as TimeIcon,
  LocalFireDepartment as BurnIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { formatDuration, formatDate, getStatusColor } from '@/lib/utils'

interface WorkoutSummaryProps {
  /** Total workout duration in seconds */
  duration: number
  /** Total calories burned */
  calories: number
  /** Current workout state */
  status: 'idle' | 'running' | 'paused' | 'finished'
  /** Name of the user performing the workout */
  userName: string
  /** The date of the workout session. */
  date: Date
}

/**
 * Reusable sub-component for displaying a workout metric.
 */
interface MetricBlockProps {
  label: string
  value: string | number
  icon: React.ElementType
  iconColor?:
    | 'action'
    | 'error'
    | 'primary'
    | 'secondary'
    | 'info'
    | 'success'
    | 'warning'
  valueColor?: string
}

const MetricBlock = ({
  label,
  value,
  icon: Icon,
  iconColor = 'action',
  valueColor = 'text.primary',
}: MetricBlockProps) => (
  <Box sx={{ textAlign: 'center', flex: 1 }}>
    <Stack
      direction="row"
      justifyContent="center"
      alignItems="center"
      gap={1}
      mb={0.5}
    >
      <Icon color={iconColor} fontSize="small" aria-hidden="true" />
      <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
    </Stack>
    <Typography
      variant="h4"
      component="p"
      sx={{
        color: valueColor,
        fontWeight: 700,
      }}
    >
      {value}
    </Typography>
  </Box>
)

/**
 * Displays a summary of the current workout session.
 */
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
        sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 2 }}
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
            color={getStatusColor(status)}
            variant={status === 'running' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 'bold',
              bgcolor: status === 'running' ? 'white' : 'transparent',
              color: status === 'running' ? 'primary.main' : 'inherit',
              borderColor: 'white',
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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          divider={<Divider orientation="vertical" flexItem />}
          spacing={2}
          justifyContent="space-around"
        >
          <MetricBlock
            label="DURATION"
            value={formatDuration(duration, {
              unit: 'seconds',
              format: 'HH:MM:SS',
            })}
            icon={TimeIcon}
          />
          <MetricBlock
            label="CALORIES"
            value={calories.toFixed(1)}
            icon={BurnIcon}
            iconColor="error"
            valueColor={calories > 0 ? 'error.main' : 'text.primary'}
          />
        </Stack>
      </CardContent>
    </Card>
  )
}

export default WorkoutSummary
