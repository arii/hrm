import { Box, Typography } from '@mui/material'

interface WorkoutSummaryProps {
  formattedDuration: string
  formattedCalories: string
}

export default function WorkoutSummary({
  formattedDuration,
  formattedCalories,
}: WorkoutSummaryProps) {
  return (
    <Box
      sx={{
        mt: 3,
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Workout Summary
      </Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Typography variant="body1" fontWeight="bold">
          Duration:
        </Typography>
        <Typography variant="body1" data-testid="workout-duration">
          {formattedDuration}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body1" fontWeight="bold">
          Est. Calories Burned:
        </Typography>
        <Typography variant="body1" data-testid="estimated-calories">
          {formattedCalories} Kcal
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1 }}
      >
        * Calorie estimate is based on your provided heart rate, age, and
        weight.
      </Typography>
    </Box>
  )
}
