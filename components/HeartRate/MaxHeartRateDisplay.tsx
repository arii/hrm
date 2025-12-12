import React from 'react'
import { Typography } from '@mui/material'

interface MaxHeartRateDisplayProps {
  maxBpm: number
}

const MaxHeartRateDisplay: React.FC<MaxHeartRateDisplayProps> = ({
  maxBpm,
}) => {
  return (
    <Typography variant="body1" component="div">
      Max: {maxBpm}
    </Typography>
  )
}

export default MaxHeartRateDisplay
