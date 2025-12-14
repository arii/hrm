import React from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import WhatshotIcon from '@mui/icons-material/Whatshot'

interface WorkoutDataDisplayProps {
  calories: number
  duration: string // Format: "MM:SS"
}

const WorkoutDataDisplay: React.FC<WorkoutDataDisplayProps> = ({
  calories,
  duration,
}) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing(1),
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing(1),
        }}
      >
        <WhatshotIcon color="error" data-testid="WhatshotIcon" />
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography variant="h6">{Math.round(calories)}</Typography>
          <Typography variant="body2">kcal</Typography>
        </Box>
      </Box>
      <Typography variant="body1">{duration}</Typography>
    </Box>
  )
}

export default WorkoutDataDisplay
