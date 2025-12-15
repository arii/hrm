// File: components/HeartRateZones.tsx (Heart Rate Zone Display)
import React from 'react'
import { Box, Typography, Paper, useTheme } from '@mui/material'
import {
  HR_ZONE_DEFINITIONS,
  getZoneBpmRange,
} from '../lib/hrm/zones'

interface HeartRateZonesProps {
  maxHr: number
}

const HeartRateZones: React.FC<HeartRateZonesProps> = ({ maxHr }) => {
  const theme = useTheme()
  return (
    <Paper elevation={3} className="p-4 mt-6">
      <Typography variant="h6" className="font-bold text-center mb-4">
        Heart Rate Zones
      </Typography>
      {HR_ZONE_DEFINITIONS.map((zone) => (
        <Box
          key={zone.name}
          className="flex items-center justify-between p-2 mb-2 rounded-lg"
          sx={{ backgroundColor: zone.color }}
        >
          <Typography
            variant="body1"
            className="font-semibold"
            sx={{ color: theme.palette.getContrastText(zone.color) }}
          >
            {zone.name}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: theme.palette.getContrastText(zone.color) }}
          >
            {`${zone.min * 100}-${
              zone.max === Infinity ? '100' : zone.max * 100
            }%`}
          </Typography>
          <Typography
            variant="body2"
            className="font-mono"
            sx={{ color: theme.palette.getContrastText(zone.color) }}
          >
            {getZoneBpmRange(zone, maxHr)}
          </Typography>
        </Box>
      ))}
    </Paper>
  )
}

export default HeartRateZones
