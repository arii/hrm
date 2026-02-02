'use client'

import { useMemo } from 'react'
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Label,
} from 'recharts'
import { format } from 'date-fns' // Ensure date-fns is installed
import { useUserSettings } from '@/context/UserSettingsContext'

// Accessibility: High contrast colors for zones (WCAG AA compliant when used as background)
const ZONE_COLORS = {
  zone1: 'rgba(189, 195, 199, 0.3)', // Grey - Warm Up
  zone2: 'rgba(52, 152, 219, 0.3)', // Blue - Fat Burn
  zone3: 'rgba(46, 204, 113, 0.3)', // Green - Aerobic
  zone4: 'rgba(241, 196, 15, 0.3)', // Yellow - Anaerobic
  zone5: 'rgba(231, 76, 60, 0.3)', // Red - Maximum
}

interface HeartRateDataPoint {
  timestamp: number | string // Date object or ISO string
  hr: number
}

interface HeartRateTimeSeriesProps {
  data: HeartRateDataPoint[]
  maxHr?: number // Allow passing maxHr for accurate zones
}

export const HeartRateTimeSeries = ({
  data,
  maxHr = 190,
}: HeartRateTimeSeriesProps) => {
  const theme = useTheme()

  // Calculate zone boundaries based on Max HR
  const zones = useMemo(
    () => ({
      z1: maxHr * 0.5,
      z2: maxHr * 0.6,
      z3: maxHr * 0.7,
      z4: maxHr * 0.8,
      z5: maxHr * 0.9,
      max: maxHr,
    }),
    [maxHr]
  )

  // Accessibility: Chart description for screen readers
  const chartDescription = `Line chart showing heart rate over time.
    Heart rate ranges from ${Math.min(...data.map((d) => d.hr))} to ${Math.max(...data.map((d) => d.hr))} BPM.
    Zones are marked in the background.`

  return (
    <Card
      elevation={2}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      role="region"
      aria-label="Heart Rate Analysis Chart"
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Heart Rate Analysis
        </Typography>

        <Box
          data-testid="hr-time-series-chart"
          sx={{ flex: 1, minHeight: 300, width: '100%' }}
          aria-label={chartDescription}
          role="img"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              accessibilityLayer // Recharts v2.10+ feature
            >
              <defs>
                <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={theme.palette.error.main}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={theme.palette.primary.main}
                    stopOpacity={0.8}
                  />
                </linearGradient>
              </defs>

              {/* Background Zones */}
              <ReferenceArea
                y1={zones.z1}
                y2={zones.z2}
                fill={ZONE_COLORS.zone1}
                strokeOpacity={0.3}
              />
              <ReferenceArea
                y1={zones.z2}
                y2={zones.z3}
                fill={ZONE_COLORS.zone2}
                strokeOpacity={0.3}
              />
              <ReferenceArea
                y1={zones.z3}
                y2={zones.z4}
                fill={ZONE_COLORS.zone3}
                strokeOpacity={0.3}
              />
              <ReferenceArea
                y1={zones.z4}
                y2={zones.z5}
                fill={ZONE_COLORS.zone4}
                strokeOpacity={0.3}
              />
              <ReferenceArea
                y1={zones.z5}
                y2={zones.max}
                fill={ZONE_COLORS.zone5}
                strokeOpacity={0.3}
              />

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={theme.palette.divider}
              />

              <XAxis
                dataKey="timestamp"
                tickFormatter={(tick) => format(new Date(tick), 'HH:mm:ss')}
                minTickGap={30}
                stroke={theme.palette.text.secondary}
                style={{ fontSize: '0.75rem' }}
              >
                <Label value="Time" offset={-5} position="insideBottom" />
              </XAxis>

              <YAxis
                domain={['dataMin - 10', zones.max + 10]} // Auto-scale but keep context
                stroke={theme.palette.text.secondary}
                style={{ fontSize: '0.75rem' }}
                width={40}
              >
                <Label
                  value="BPM"
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>

              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 4,
                }}
                labelFormatter={(label) => format(new Date(label), 'pp')} // Localized time
                formatter={(value) =>
                  typeof value === 'number'
                    ? [`${value.toFixed(0)} BPM`, 'Heart Rate']
                    : [null, null]
                }
              />

              <Line
                type="monotone"
                dataKey="hr"
                stroke="url(#colorHr)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={false} // Disable animation for real-time performance
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
}

export const ConnectedHeartRateChart = ({
  data,
}: {
  data: HeartRateDataPoint[]
}) => {
  const [preferences] = useUserSettings()

  // Pass the user's specific Max HR to the chart
  return (
    <HeartRateTimeSeries data={data} maxHr={preferences.maxHeartRate || 190} />
  )
}
