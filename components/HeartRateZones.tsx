// File: components/HeartRateZones.tsx (Heart Rate Zone Display)
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import React from 'react'

interface HeartRateZonesProps {
  maxHr: number
}

const HeartRateZones: React.FC<HeartRateZonesProps> = ({ maxHr }) => {
  const zones = [
    { name: 'Zone 5', percentage: '90-100%', color: '#F44336' },
    { name: 'Zone 4', percentage: '80-90%', color: '#FFEB3B' },
    { name: 'Zone 3', percentage: '70-80%', color: '#4CAF50' },
    { name: 'Zone 2', percentage: '60-70%', color: '#2196F3' },
    { name: 'Zone 1', percentage: '50-60%', color: '#9E9E9E' },
  ]

  const calculateBpmRange = (percentage: string) => {
    const [min, max] = percentage.replace('%', '').split('-').map(Number)
    const minBpm = Math.round(((min || 0) / 100) * maxHr)
    const maxBpm = Math.round(((max || 0) / 100) * maxHr)
    return `${minBpm}-${maxBpm} BPM`
  }

  return (
    <Paper elevation={3} className="p-4 mt-6">
      <Typography variant="h6" className="font-bold text-center mb-4">
        Heart Rate Zones
      </Typography>
      {zones.map((zone) => (
        <Box
          key={zone.name}
          className="flex items-center justify-between p-2 mb-2 rounded-lg"
          style={{ backgroundColor: zone.color }}
        >
          <Typography variant="body1" className="font-semibold text-white">
            {zone.name}
          </Typography>
          <Typography variant="body2" className="text-white">
            {zone.percentage}
          </Typography>
          <Typography variant="body2" className="font-mono text-white">
            {calculateBpmRange(zone.percentage)}
          </Typography>
        </Box>
      ))}
    </Paper>
  )
}

export default HeartRateZones
