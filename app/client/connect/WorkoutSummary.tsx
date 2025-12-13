import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import TimerIcon from '@mui/icons-material/Timer'
import WhatshotIcon from '@mui/icons-material/Whatshot'

interface WorkoutSummaryProps {
  duration: string
  caloriesBurned: string
}

export default function WorkoutSummary({
  duration,
  caloriesBurned,
}: WorkoutSummaryProps) {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Typography
        variant="h6"
        component="h3"
        gutterBottom
        align="center"
        fontWeight="bold"
      >
        Workout Summary
      </Typography>
      <Stack
        direction="row"
        justifyContent="space-around"
        alignItems="center"
        spacing={2}
        sx={{ mt: 2 }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            color="text.secondary"
          >
            <TimerIcon />
            <Typography variant="subtitle1">Duration</Typography>
          </Stack>
          <Typography variant="h5" fontWeight="medium">
            {duration}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            color="text.secondary"
          >
            <WhatshotIcon />
            <Typography variant="subtitle1">Calories (est.)</Typography>
          </Stack>
          <Typography variant="h5" fontWeight="medium">
            {caloriesBurned === '0' ? '---' : caloriesBurned}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  )
}
