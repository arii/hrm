// app/client/experimental/components/ZoneDistributionChart.tsx
'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { HrZoneName, getUserHrZones, calculateMaxHr } from '@/utils/hr-zones'
import { getHrZoneProps } from '@/utils/visualization'

interface ZoneDistributionChartProps {
  timeInZones: Record<HrZoneName, number>
  userAge: number | null
}

const ZoneDistributionChart = ({
  timeInZones,
  userAge,
}: ZoneDistributionChartProps) => {
  const zones = getUserHrZones(userAge || 30)
  const maxHr = calculateMaxHr(userAge || 30)

  const chartData = Object.entries(timeInZones)
    .filter(
      ([zone]) =>
        zone !== HrZoneName.NoData &&
        zone !== HrZoneName.Unknown &&
        timeInZones[zone as HrZoneName] > 0
    )
    .map(([zone, time]) => {
      const zoneKey = (zone.charAt(0).toLowerCase() + zone.slice(1)).replace(
        /\s+/g,
        ''
      ) as keyof typeof zones
      const minHr = zones[zoneKey]?.min || 0
      const zoneProps = getHrZoneProps(minHr, maxHr)
      return {
        name: zone,
        time: time,
        fill: zoneProps.backgroundColor,
      }
    })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip
          formatter={(value) => {
            if (typeof value === 'number') {
              return [`${value}s`, 'Time']
            }
            return [String(value), 'Time']
          }}
          cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
        />
        <Bar dataKey="time">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default ZoneDistributionChart
