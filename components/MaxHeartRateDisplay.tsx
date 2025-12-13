import React from 'react'
import { Typography, Box } from '@mui/material'

interface MaxHeartRateDisplayProps {
  maxBpm: number | null
}

const MaxHeartRateDisplay = React.memo<MaxHeartRateDisplayProps>(
  ({ maxBpm }) => {
    return (
      <Box>
        <Typography variant="body1">
          Max Heart Rate:{' '}
          <Typography component="strong" variant="body1">
            {maxBpm ?? '--'} bpm
          </Typography>
        </Typography>
      </Box>
    )
  }
)

MaxHeartRateDisplay.displayName = 'MaxHeartRateDisplay'
export default MaxHeartRateDisplay
