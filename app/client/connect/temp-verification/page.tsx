'use client'
import RealTimeChart from '../components/RealTimeChart'
import ZoneDistributionTable from '../components/ZoneDistributionTable'
import { HR_ZONE_DEFINITIONS } from '@/lib/hrm/zones'
import { getHrZoneColor } from '@/utils/visualization'

const mockHistory = [
  { time: 1, hr: 100, calories: 10 },
  { time: 2, hr: 110, calories: 20 },
  { time: 3, hr: 120, calories: 30 },
  { time: 4, hr: 130, calories: 40 },
  { time: 5, hr: 140, calories: 50 },
]

const mockZoneDistribution = HR_ZONE_DEFINITIONS.map((zone, index) => ({
  zone: zone.name,
  duration: 1,
  percentage: 20,
  color: getHrZoneColor(zone.name),
  bpmRange: `${Math.round(190 * zone.min)}-${Math.round(
    190 * (HR_ZONE_DEFINITIONS[index + 1]?.min || 1)
  )}`,
}))

export default function TempVerificationPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Temporary Verification Page</h1>
      <h2>RealTimeChart</h2>
      <RealTimeChart data={mockHistory} />
      <h2>ZoneDistributionTable</h2>
      <ZoneDistributionTable data={mockZoneDistribution} />
    </div>
  )
}
