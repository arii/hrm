import React from 'react'
import { Typography, Box } from '@mui/material'

interface AverageHeartRateDisplayProps {
  avgBpm: number | null
}

const AverageHeartRateDisplay = React.memo<AverageHeartRateDisplayProps>(
  ({ avgBpm }) => {
    return (
      <Box>
        <Typography variant="body1">
          Avg Heart Rate:{' '}
          <Typography component="strong" variant="body1">
            {avgBpm ?? '--'} bpm
          </Typography>
        </Typography>
      </Box>
    )
  }
)

AverageHeartRateDisplay.displayName = 'AverageHeartRateDisplay'
export default AverageHeartRateDisplay
