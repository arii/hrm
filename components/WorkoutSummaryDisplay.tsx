import { Box, Paper, Typography, keyframes } from '@mui/material'

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

interface WorkoutSummaryDisplayProps {
  duration: string
  caloriesBurned: number
}

/**
 * A component to display a summary of the workout session.
 * @param {string} duration - The total duration of the workout, formatted as HH:MM:SS.
 * @param {number} caloriesBurned - The total estimated calories burned during the session.
 */
export default function WorkoutSummaryDisplay({
  duration,
  caloriesBurned,
}: WorkoutSummaryDisplayProps) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mt: 4,
        mb: 2,
        textAlign: 'center',
        backgroundColor: 'background.paper',
        animation: `${fadeIn} 0.5s ease-out`,
        border: '1px solid',
        borderColor: 'primary.main',
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom>
        Workout Summary
      </Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          mt: 2,
        }}
      >
        <Box>
          <Typography variant="h6" color="text.secondary">
            Duration
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {duration}
          </Typography>
        </Box>
        <Box>
          <Typography variant="h6" color="text.secondary">
            Calories Burned
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {Math.round(caloriesBurned)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Est.
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}
