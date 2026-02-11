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
import { formatDuration } from '@/lib/utils'

interface WorkoutSummaryProps {
  duration: number // Changed from string to number for raw formatting
  calories: number
  status: 'idle' | 'running' | 'paused' | 'finished'
  userName?: string
  date?: Date
}

const WorkoutSummary = ({
  duration,
  calories,
  status,
  userName = 'Guest User',
  date,
}: WorkoutSummaryProps) => {
  const theme = useTheme()

  // Helper to determine status color
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'running':
        return 'success'
      case 'paused':
        return 'warning'
      case 'finished':
        return 'primary'
      default:
        return 'default'
    }
  }

  const formattedDate = date
    ? date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Today'

  return (
    <Card
      elevation={4}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        mt: 2,
      }}
    >
      {/* Header Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 2 }}>
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
              <PersonIcon fontSize="small" /> {userName}
            </Typography>
          </Box>
          <Chip
            label={status ? status.toUpperCase() : 'IDLE'}
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
          {/* Duration Block */}
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              gap={1}
              mb={0.5}
            >
              <TimeIcon color="action" fontSize="small" />
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

          {/* Calories Block */}
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              gap={1}
              mb={0.5}
            >
              <BurnIcon color="error" fontSize="small" />
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
              sx={{ color: calories > 0 ? 'error.main' : 'text.primary' }}
            >
              {calories.toFixed(1)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default WorkoutSummary
