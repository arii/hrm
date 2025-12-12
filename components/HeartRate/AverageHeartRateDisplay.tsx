import React from 'react'
import { Typography } from '@mui/material'

interface AverageHeartRateDisplayProps {
  avgBpm: number
}

const AverageHeartRateDisplay: React.FC<AverageHeartRateDisplayProps> = ({
  avgBpm,
}) => {
  return (
    <Typography variant="body1" component="div">
      Avg: {avgBpm}
    </Typography>
  )
}

export default AverageHeartRateDisplay
