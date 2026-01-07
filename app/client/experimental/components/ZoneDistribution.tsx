// app/client/experimental/components/ZoneDistribution.tsx
import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'
import { HrZoneName, getUserHrZones, calculateMaxHr } from '@/utils/hr-zones'
import { getHrZoneProps } from '@/utils/visualization'

interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  userAge: number | null
}

const ZoneDistribution = ({ timeInZones, userAge }: ZoneDistributionProps) => {
  const totalDuration = Object.values(timeInZones).reduce(
    (sum, time) => sum + time,
    0
  )
  const zones = getUserHrZones(userAge || 30)
  const maxHr = calculateMaxHr(userAge || 30)

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Time in Zones
        </Typography>
        {Object.entries(timeInZones)
          .filter(
            ([zone]) =>
              zone !== HrZoneName.NoData && zone !== HrZoneName.Unknown
          )
          .map(([zone, time]) => {
            if (time === 0) return null
            const percentage =
              totalDuration > 0 ? ((time / totalDuration) * 100).toFixed(1) : 0
            const zoneKey = (
              zone.charAt(0).toLowerCase() + zone.slice(1)
            ).replace(/\s+/g, '') as keyof typeof zones
            const minHr = zones[zoneKey]?.min || 0
            const zoneProps = getHrZoneProps(minHr, maxHr)
            return (
              <Box
                key={zone}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  my: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: zoneProps.backgroundColor,
                      mr: 1,
                    }}
                  />
                  <Typography variant="body1">{zone}</Typography>
                </Box>
                <Typography variant="body1">{`${time}s (${percentage}%)`}</Typography>
              </Box>
            )
          })}
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution
