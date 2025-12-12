import React from 'react'
import { Chip } from '@mui/material'
import { getHrZoneProps } from '@/utils/visualization'
import { MAX_HR_DEFAULT } from '@/utils/constants'

interface HeartRateZoneIndicatorProps {
  bpm: number | null
  maxHr?: number
}

const HeartRateZoneIndicator: React.FC<HeartRateZoneIndicatorProps> = ({
  bpm,
  maxHr,
}) => {
  if (bpm === null) {
    return <Chip label="Zone: --" />
  }

  const { zone, color } = getHrZoneProps(bpm, maxHr || MAX_HR_DEFAULT)

  return (
    <Chip
      label={`Zone: ${zone}`}
      style={{ backgroundColor: color, color: 'white' }}
    />
  )
}

export default HeartRateZoneIndicator
