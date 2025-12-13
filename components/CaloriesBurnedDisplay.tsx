import React from 'react'
import { Typography, Box } from '@mui/material'

interface CaloriesBurnedDisplayProps {
  calories: number | null
}

const CaloriesBurnedDisplay = React.memo<CaloriesBurnedDisplayProps>(
  ({ calories }) => {
    return (
      <Box>
        <Typography variant="body1">
          Calories Burned:{' '}
          <Typography component="strong" variant="body1">
            {calories ?? '--'} kcal
          </Typography>
        </Typography>
      </Box>
    )
  }
)

CaloriesBurnedDisplay.displayName = 'CaloriesBurnedDisplay'
export default CaloriesBurnedDisplay
