import React from 'react'
import { Typography, Box } from '@mui/material'

const HeartRateDisplay = React.memo(() => {
  return (
    <Box>
      <Typography variant="body1">
        Heart Rate:{' '}
        <Typography component="strong" variant="body1">
          -- bpm
        </Typography>
      </Typography>
    </Box>
  )
})

HeartRateDisplay.displayName = 'HeartRateDisplay'
export default HeartRateDisplay
