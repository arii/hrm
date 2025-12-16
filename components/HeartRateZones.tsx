// File: components/HeartRateZones.tsx (Heart Rate Zone Display)
import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { HEART_RATE_ZONES, HeartRateZoneConfig } from '../utils/constants'

interface HeartRateZonesProps {
  maxHr: number
}

const HeartRateZones: React.FC<HeartRateZonesProps> = ({ maxHr }) => {
  const calculateBpmRange = (zone: HeartRateZoneConfig) => {
    const minBpm = Math.round((zone.minPercent / 100) * maxHr)
    const maxBpm = Math.round((zone.maxPercent / 100) * maxHr)
    return `${minBpm}-${maxBpm} BPM`
  }

  return (
    <Paper elevation={3} className="p-4 mt-6">
      <Typography variant="h6" className="font-bold text-center mb-4">
        Heart Rate Zones
      </Typography>
      {HEART_RATE_ZONES.map((zone) => (
        <Box
          key={zone.name}
          className="flex items-center justify-between p-2 mb-2 rounded-lg"
          style={{ backgroundColor: zone.color }}
        >
          <Typography variant="body1" className="font-semibold text-white">
            {zone.name}
          </Typography>
          <Typography variant="body2" className="text-white">
            {zone.minPercent}-{zone.maxPercent}%
          </Typography>
          <Typography variant="body2" className="font-mono text-white">
            {calculateBpmRange(zone)}
          </Typography>
        </Box>
      ))}
    </Paper>
  )
}

export default HeartRateZones
