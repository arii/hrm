import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import TimerIcon from '@mui/icons-material/Timer'

interface WorkoutSummaryProps {
  duration: string
  caloriesBurned: number
}

export default function WorkoutSummary({
  duration,
  caloriesBurned,
}: WorkoutSummaryProps) {
  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom align="center">
        Workout Summary
      </Typography>
      <Stack
        direction="row"
        justifyContent="space-around"
        alignItems="center"
        spacing={2}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            color="text.secondary"
          >
            <TimerIcon />
            <Typography variant="h5">{duration}</Typography>
          </Stack>
          <Typography variant="caption">Duration</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            color="text.secondary"
          >
            <LocalFireDepartmentIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h5">{caloriesBurned.toFixed(0)}</Typography>
          </Stack>
          <Typography variant="caption">Calories</Typography>
        </Box>
      </Stack>
    </Paper>
  )
}
