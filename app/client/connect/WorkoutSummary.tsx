import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import WatchLaterIcon from '@mui/icons-material/WatchLater'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import { formatDuration, formatDate } from '@/lib/utils'
import EventIcon from '@mui/icons-material/Event'
import PersonIcon from '@mui/icons-material/Person'

interface WorkoutSummaryProps {
  workoutDuration: number
  caloriesBurned: number
  userName: string
  date?: Date
}

const WorkoutSummary = ({
  workoutDuration,
  caloriesBurned,
  userName,
  date,
}: WorkoutSummaryProps) => {
  const formattedDuration = formatDuration(workoutDuration, {
    format: 'HH:MM:SS',
    unit: 'seconds',
  })

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mt: 2,
        bgcolor: 'background.paper',
        borderRadius: 1.5,
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h6" component="h3" align="center" gutterBottom>
          Workout Summary
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
            },
            gap: 2,
            textAlign: 'center',
            alignItems: 'start',
          }}
        >
          <Stack spacing={1} alignItems="center">
            <WatchLaterIcon color="action" sx={{ fontSize: 30 }} />
            <Typography variant="h5" component="p" fontWeight="bold">
              {formattedDuration}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Duration
            </Typography>
          </Stack>
          <Stack spacing={1} alignItems="center">
            <WhatshotIcon color="error" sx={{ fontSize: 30 }} />
            <Typography variant="h5" component="p" fontWeight="bold">
              {caloriesBurned.toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Calories Burned
            </Typography>
          </Stack>
          <Stack spacing={1} alignItems="center">
            <PersonIcon sx={{ fontSize: 30 }} />
            <Typography variant="body1" component="p" fontWeight="bold">
              {userName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              User
            </Typography>
          </Stack>
          {date && (
            <Stack spacing={1} alignItems="center">
              <EventIcon sx={{ fontSize: 30 }} />
              <Typography variant="body1" component="p" fontWeight="bold">
                {formatDate(date)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Date
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  )
}

export default WorkoutSummary
