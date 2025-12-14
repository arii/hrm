// File: components/WorkoutDataDisplay.tsx
'use client'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import WhatshotIcon from '@mui/icons-material/Whatshot'

interface WorkoutDataDisplayProps {
  calories: number
  duration: string
}

const WorkoutDataDisplay = ({
  calories,
  duration,
}: WorkoutDataDisplayProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: { xs: 'column', md: 'row' },
        textAlign: { xs: 'center', md: 'left' },
        mt: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <WhatshotIcon color="error" fontSize="small" />
        <Typography variant="h6" color="error">
          {calories}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          kcal
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {duration}
      </Typography>
    </Box>
  )
}

export default WorkoutDataDisplay
