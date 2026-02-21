// app/client/experimental/components/HeartRateTimeSeries.tsx
'use client'
import { useMemo } from 'react'
import { Card, CardContent, Typography, Box, useTheme, Skeleton } from '@mui/material'
import dynamic from 'next/dynamic'
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
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
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
              />
              <XAxis dataKey="time" tickFormatter={formatTime} />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="hr"
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
}

export const AsyncHeartRateTimeSeries = dynamic(
  () => Promise.resolve(HeartRateTimeSeries),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={300} />,
  }
)

export default HeartRateTimeSeries
