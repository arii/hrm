import React from 'react'
import { Typography, Box } from '@mui/material'

const AverageHeartRateDisplay = React.memo(() => {
  return (
    <Box>
      <Typography variant="body1">
        Avg Heart Rate:{' '}
        <Typography component="strong" variant="body1">
          -- bpm
        </Typography>
      </Typography>
    </Box>
  )
})

AverageHeartRateDisplay.displayName = 'AverageHeartRateDisplay'
export default AverageHeartRateDisplay
