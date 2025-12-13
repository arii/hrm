import React from 'react'
import { Typography, Box } from '@mui/material'

const MaxHeartRateDisplay = React.memo(() => {
  return (
    <Box>
      <Typography variant="body1">
        Max Heart Rate:{' '}
        <Typography component="strong" variant="body1">
          -- bpm
        </Typography>
      </Typography>
    </Box>
  )
})

MaxHeartRateDisplay.displayName = 'MaxHeartRateDisplay'
export default MaxHeartRateDisplay
