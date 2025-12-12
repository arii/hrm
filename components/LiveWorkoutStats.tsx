import { Box, Typography } from '@mui/material'

interface LiveWorkoutStatsProps {
  duration: string
  calories: number
}

/**
 * A component to display live workout statistics (duration and calories).
 */
export default function LiveWorkoutStats({
  duration,
  calories,
}: LiveWorkoutStatsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-around',
        textAlign: 'center',
        mt: 2,
        py: 1,
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box>
        <Typography variant="caption" color="text.secondary">
          DURATION
        </Typography>
        <Typography variant="h6" fontWeight="500">
          {duration}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          CALORIES (EST.)
        </Typography>
        <Typography variant="h6" fontWeight="500">
          {Math.round(calories)}
        </Typography>
      </Box>
    </Box>
  )
}
