// app/client/experimental/components/ZoneDistribution.tsx
'use client'
import { Card, CardContent, Typography } from '@mui/material'
import { HrZoneName } from '@/utils/hr-zones'
import ZoneDistributionChart from './ZoneDistributionChart'

interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  userAge: number | null
}

const ZoneDistribution = ({ timeInZones, userAge }: ZoneDistributionProps) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Time in Zones
        </Typography>
        <ZoneDistributionChart timeInZones={timeInZones} userAge={userAge} />
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution
