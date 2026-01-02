// File: components/WorkoutDataDisplay.tsx
'use client'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import { useTheme } from '@mui/material/styles'

interface WorkoutDataDisplayProps {
  calories: number
  duration: string // Format: "MM:SS"
}

const WorkoutDataDisplay = ({
  calories,
  duration,
}: WorkoutDataDisplayProps) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing(1),
        py: 1,
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
        <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
          {Math.floor(calories)}
        </Typography>
        <Typography variant="body2" component="span">
          kcal
        </Typography>
      </Box>
      <Typography variant="body1" component="span">
        {duration}
      </Typography>
    </Box>
  )
}

export default WorkoutDataDisplay
