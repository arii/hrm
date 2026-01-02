'use client'

import { Container, Typography, Box } from '@mui/material'
import RealTimeChart from '@/app/client/connect/components/RealTimeChart'
import ZoneDistributionTable from '@/app/client/connect/components/ZoneDistributionTable'

const mockWorkoutHistory = [
  { time: 0, hr: 80, calories: 10 },
  { time: 60, hr: 120, calories: 50 },
  { time: 120, hr: 140, calories: 100 },
  { time: 180, hr: 160, calories: 150 },
  { time: 240, hr: 150, calories: 200 },
  { time: 300, hr: 130, calories: 250 },
]

const mockZoneDistribution = [
  { zone: 'WarmUp', range: '95 - 114', duration: 60, percentage: 20 },
  { zone: 'FatBurn', range: '114 - 133', duration: 120, percentage: 40 },
  { zone: 'Cardio', range: '133 - 162', duration: 120, percentage: 40 },
]

export default function AnalyticsDebugPage() {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Analytics Debug Page
      </Typography>
      <Box sx={{ my: 2, width: '100%', height: 400 }}>
        <RealTimeChart data={mockWorkoutHistory} />
      </Box>
      <Box sx={{ my: 2, width: '100%' }}>
        <ZoneDistributionTable zoneDistribution={mockZoneDistribution} />
      </Box>
    </Container>
  )
}
