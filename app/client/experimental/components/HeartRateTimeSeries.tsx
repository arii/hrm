// app/client/experimental/components/HeartRateTimeSeries.tsx
'use client'
import { useMemo } from 'react'
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material'
import { HrDataPoint } from '@/lib/workout-session-storage'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface HeartRateTimeSeriesProps {
  hrHistory: HrDataPoint[]
}

const HeartRateTimeSeries = ({ hrHistory }: HeartRateTimeSeriesProps) => {
  const theme = useTheme()

  const formatTime = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    return (time: number) => formatter.format(new Date(time))
  }, [])

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Heart Rate Over Time
        </Typography>
        <Box
          sx={{ height: 300, minHeight: 300 }}
          data-testid="hr-time-series-chart"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hrHistory} syncId="anyId">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: theme.shape.borderRadius,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[3],
                }}
                labelFormatter={(label) => formatTime(label)}
                formatter={(value: number | undefined) => [
                  value ? `${value} bpm` : 'N/A',
                  'Heart Rate',
                ]}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="hr"
                name="Heart Rate"
                stroke={theme.palette.primary.main}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: theme.palette.primary.main }}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
}

export default HeartRateTimeSeries
