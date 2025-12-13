import React from 'react'
import { Typography, Box } from '@mui/material'

const CaloriesBurnedDisplay = React.memo(() => {
  return (
    <Box>
      <Typography variant="body1">
        Calories Burned:{' '}
        <Typography component="strong" variant="body1">
          -- kcal
        </Typography>
      </Typography>
    </Box>
  )
})

CaloriesBurnedDisplay.displayName = 'CaloriesBurnedDisplay'
export default CaloriesBurnedDisplay
