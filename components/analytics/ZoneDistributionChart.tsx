// components/analytics/ZoneDistributionChart.tsx
'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts'
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  Theme,
} from '@mui/material'
import { HrZoneName } from '@/lib/workout-session-storage'
import { SessionStatus } from '@/hooks/useWorkoutSessionManager'

interface ZoneDistributionChartProps {
  timeInZones: Record<HrZoneName, number>
  status: SessionStatus
  isLive: boolean
}

// Define colors for the zones, using MUI theme for consistency
const getZoneColor = (zone: HrZoneName, theme: Theme) => {
  const colors: Record<HrZoneName, string> = {
    [HrZoneName.Max]: theme.palette.error.dark, // Darker red for max intensity
    [HrZoneName.Peak]: theme.palette.primary.main, // Red
    [HrZoneName.Cardio]: theme.palette.warning.main, // Yellow
    [HrZoneName.FatBurn]: theme.palette.success.main, // Green
    [HrZoneName.WarmUp]: theme.palette.secondary.main, // Blue
    [HrZoneName.Unknown]: theme.palette.grey[300],
    [HrZoneName.NoData]: theme.palette.grey[100],
  }
  return colors[zone] || theme.palette.grey[500]
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const ZoneDistributionChart = ({
  timeInZones,
  status,
  isLive,
}: ZoneDistributionChartProps) => {
  const theme = useTheme()

  const data = Object.entries(timeInZones)
    .map(([name, time]) => ({
      name: name as HrZoneName,
      time,
    }))
    .filter(
      (item) =>
        item.time > 0 &&
        item.name !== HrZoneName.Unknown &&
        item.name !== HrZoneName.NoData
    )
    .sort((a, b) => b.time - a.time) // Sort for better visualization

  const isPaused = isLive && status === 'paused'

  return (
    <Card
      sx={{
        transition: 'opacity 0.3s ease-in-out',
        opacity: isPaused ? 0.5 : 1,
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h5" component="h2" gutterBottom>
            Zone Distribution
          </Typography>
          {isPaused && (
            <Typography variant="h6" component="span" color="text.secondary">
              (Paused)
            </Typography>
          )}
        </Box>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              aria-label="Bar chart showing time spent in each heart rate zone"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(tick) => formatTime(tick as number)}
                label={{
                  value: 'Time',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                formatter={(value) => [
                  formatTime(value as number),
                  'Time spent',
                ]}
                cursor={{ fill: 'rgba(0,0,0,0.1)' }}
              />
              <Legend />
              <Bar dataKey="time" name="Time in Zone">
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={getZoneColor(entry.name, theme)}
                  />
                ))}
                <LabelList
                  dataKey="time"
                  position="top"
                  formatter={(value: unknown) =>
                    typeof value === 'number' ? formatTime(value) : ''
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
}

export default ZoneDistributionChart
