// app/client/experimental/components/HeartRateTimeSeries.tsx
'use client'
import { Card, CardContent, Typography, Box } from '@mui/material'
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
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Heart Rate Over Time
        </Typography>
        <Box sx={{ height: 300 }} data-testid="hr-time-series-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hrHistory} syncId="anyId">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickFormatter={(time) => new Date(time).toLocaleTimeString()}
              />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="hr"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
}

export default HeartRateTimeSeries
