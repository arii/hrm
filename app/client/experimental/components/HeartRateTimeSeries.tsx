'use client'

import { useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha,
  Theme,
} from '@mui/material'
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
import { MAX_HR_DEFAULT } from '@/lib/shared/hr-zones'

// Accessibility: High contrast colors for zones (WCAG AA compliant when used as background)
const getZoneColors = (theme: Theme) => ({
  zone1: alpha(theme.palette.secondary.main, 0.3), // Blue - Warm Up
  zone2: alpha(theme.palette.success.main, 0.3), // Green - Fat Burn
  zone3: alpha(theme.palette.warning.main, 0.3), // Yellow - Cardio
  zone4: alpha(theme.palette.error.main, 0.3), // Red - Peak
  zone5: alpha(theme.palette.primary.main, 0.3), // Purple - Max
})

interface HeartRateDataPoint {
  time: number // Unix timestamp
  hr: number
}

interface HeartRateTimeSeriesProps {
  data: HeartRateDataPoint[]
  maxHr?: number // Allow passing maxHr for accurate zones
}

import React from 'react'

const HeartRateTimeSeriesBase = ({
  data,
  maxHr = MAX_HR_DEFAULT,
}: HeartRateTimeSeriesProps) => {
  const theme = useTheme()
  const ZONE_COLORS = useMemo(() => getZoneColors(theme), [theme])

  const xAxisTickFormatter = useCallback(
    (tick: number) => format(new Date(tick), 'HH:mm:ss'),
    []
  )
  const tooltipLabelFormatter = useCallback((label: unknown) => {
    if (typeof label === 'number' || typeof label === 'string') {
      return format(new Date(label), 'pp')
    }
    return ''
  }, [])
  const tooltipValueFormatter = useCallback(
    (value: number | string | (number | string)[]) =>
      typeof value === 'number'
        ? [`${value.toFixed(0)} BPM`, 'Heart Rate']
        : [null, null],
    []
  )

  // Calculate zone boundaries based on Max HR
  const zones = useMemo(
    () => ({
      z1: maxHr * 0.5,
      z2: maxHr * 0.6,
      z3: maxHr * 0.7,
      z4: maxHr * 0.85,
      z5: maxHr * 0.95,
      max: maxHr,
    }),
    [maxHr]
  )

  // Accessibility: Chart description for screen readers
  const chartDescription = useMemo(() => {
    if (data.length === 0) return 'Heart rate chart with no data.'
    let minHr = data[0]!.hr
    let maxHrValue = data[0]!.hr
    for (let i = 1; i < data.length; i++) {
      if (data[i]!.hr < minHr) minHr = data[i]!.hr
      if (data[i]!.hr > maxHrValue) maxHrValue = data[i]!.hr
    }
    return `Line chart showing heart rate over time.
    Heart rate ranges from ${minHr} to ${maxHrValue} BPM.
    Zones are marked in the background.`
  }, [data])

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

              <defs>
                <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="#9C27B0" // Purple - Max Intensity
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={theme.palette.secondary.main} // Blue - Low Intensity
                    stopOpacity={0.8}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={theme.palette.divider}
              />

              <XAxis
                dataKey="time"
                tickFormatter={xAxisTickFormatter}
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
                labelFormatter={tooltipLabelFormatter} // Localized time
                formatter={tooltipValueFormatter}
              />

              <Line
                type="linear"
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

export const HeartRateTimeSeries = React.memo(HeartRateTimeSeriesBase)

export const ConnectedHeartRateChart = ({
  data,
}: {
  data: HeartRateDataPoint[]
}) => {
  const [preferences] = useUserSettings()

  // Pass the user's specific Max HR to the chart
  return (
    <HeartRateTimeSeries
      data={data}
      maxHr={preferences.maxHeartRate || MAX_HR_DEFAULT}
    />
  )
}
