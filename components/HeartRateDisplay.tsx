import React from 'react'
import { Typography, Box } from '@mui/material'

interface HeartRateDisplayProps {
  bpm: number | null
}

const HeartRateDisplay = React.memo<HeartRateDisplayProps>(({ bpm }) => {
  return (
    <Box>
      <Typography variant="body1">
        Heart Rate:{' '}
        <Typography component="strong" variant="body1">
          {bpm ?? '--'} bpm
        </Typography>
      </Typography>
    </Box>
  )
})

HeartRateDisplay.displayName = 'HeartRateDisplay'
export default HeartRateDisplay
