'use client'
<<<<<<< HEAD

=======
import { useMemo } from 'react'
>>>>>>> origin/leader
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

<<<<<<< HEAD
=======
  const formatTime = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    return (time: number) => formatter.format(new Date(time))
  }, [])

>>>>>>> origin/leader
  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Heart Rate Over Time
        </Typography>
        <Box
          sx={{ height: 300, minHeight: 300 }}
          data-testid="hr-time-series-chart"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hrHistory} syncId="anyId">
<<<<<<< HEAD
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
=======
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
              />
              <XAxis dataKey="time" tickFormatter={formatTime} />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
>>>>>>> origin/leader
              <Legend />
              <Line
                type="monotone"
                dataKey="hr"
<<<<<<< HEAD
                name="Heart Rate"
=======
>>>>>>> origin/leader
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

export default HeartRateTimeSeries
