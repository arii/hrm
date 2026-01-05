import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import WatchLaterIcon from '@mui/icons-material/WatchLater'
import WhatshotIcon from '@mui/icons-material/Whatshot'

interface WorkoutSummaryProps {
  duration: string
  caloriesBurned: number
}

const WorkoutSummary = ({ duration, caloriesBurned }: WorkoutSummaryProps) => {
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
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Stack spacing={1} alignItems="center">
            <WatchLaterIcon color="action" sx={{ fontSize: 30 }} />
            <Typography variant="h5" component="p" fontWeight="bold">
              {duration}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Duration
            </Typography>
          </Stack>
          <Stack spacing={1} alignItems="center">
            <WhatshotIcon color="error" sx={{ fontSize: 30 }} />
            <Typography variant="h5" component="p" fontWeight="bold">
              {(Number(caloriesBurned) || 0).toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Calories Burned
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  )
}

export default WorkoutSummary
