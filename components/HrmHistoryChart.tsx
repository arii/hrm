// File: components/HrmHistoryChart.tsx
'use client'
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
import Box from '@mui/material/Box'
import { HrmDataPoint } from '../services/hrmDataService'

interface HrmHistoryChartProps {
  data: HrmDataPoint[]
}

const HrmHistoryChart = ({ data }: HrmHistoryChartProps) => {

  return (
    <Box sx={{ height: 400 }} data-testid="hrm-history-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(time) => new Date(time).toLocaleString()}
            formatter={(value) => [`${value} BPM`, 'Heart Rate']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="hrm"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default HrmHistoryChart
