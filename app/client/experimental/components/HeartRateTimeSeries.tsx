'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  Skeleton,
} from '@mui/material'
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Heart Rate Over Time
        </Typography>
        <Box sx={{ height: 300 }} data-testid="hr-time-series-chart">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hrHistory} syncId="anyId">
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: theme.shape.borderRadius,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: theme.shadows[2],
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hr"
                  name="Heart Rate"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton
              variant="rectangular"
              width="100%"
              height="100%"
              animation="wave"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default HeartRateTimeSeries
