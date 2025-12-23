// File: components/HrmZones.tsx
'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { HrmDataPoint } from '../services/hrmDataService'
import { getHrZoneProps, ZONE_COLORS } from '../utils/visualization'
import { useUserSettings } from '@/context/UserSettingsContext'
import { MAX_HR_DEFAULT } from '@/utils/constants'

interface HrmZonesProps {
  data: HrmDataPoint[]
}

const HrmZones = ({ data }: HrmZonesProps) => {
  const [userSettings] = useUserSettings()

  const zoneData = useMemo(() => {
    const maxHr = userSettings.maxHr || MAX_HR_DEFAULT
    const zones: Record<string, number> = {
      WarmUp: 0,
      FatBurn: 0,
      Cardio: 0,
      Peak: 0,
      Max: 0,
    }

    for (let i = 1; i < data.length; i++) {
      const prevPoint = data[i - 1]
      const currentPoint = data[i]
      const durationSeconds = (currentPoint.timestamp - prevPoint.timestamp) / 1000

      // Use the zone of the previous point for the duration
      const zoneName = getHrZoneProps(prevPoint.hrm, maxHr).zone
      if (zones[zoneName] !== undefined) {
        zones[zoneName] += durationSeconds
      }
    }

    return Object.entries(zones).map(([name, seconds]) => ({
      name,
      minutes: parseFloat((seconds / 60).toFixed(2)),
    }))
  }, [data, userSettings.maxHr])

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2, height: 300 }}>
      <Typography variant="h6" gutterBottom>
        Time in Zones (minutes)
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={zoneData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            formatter={(value) => [`${value} minutes`, 'Time']}
          />
          <Bar dataKey="minutes">
            {zoneData.map((entry, index) => {
              const colorKey =
                entry.name === 'WarmUp'
                  ? 'blue'
                  : entry.name === 'FatBurn'
                  ? 'green'
                  : entry.name === 'Cardio'
                  ? 'yellow'
                  : entry.name === 'Peak'
                  ? 'red'
                  : 'purple'
              return <Cell key={`cell-${index}`} fill={ZONE_COLORS[colorKey]} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}

export default HrmZones
