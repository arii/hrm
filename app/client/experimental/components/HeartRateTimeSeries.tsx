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
import { useTheme } from '@mui/material/styles'

interface HeartRateTimeSeriesProps {
  hrHistory: HrDataPoint[]
}

const HeartRateTimeSeries = ({ hrHistory }: HeartRateTimeSeriesProps) => {
  const theme = useTheme();

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Heart Rate Over Time
        </Typography>
        <Box sx={{ minHeight: 300 }} data-testid="hr-time-series-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hrHistory} syncId="anyId">
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
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
                stroke={theme.palette.custom.work}
                strokeWidth={2}
                dot={false}
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
