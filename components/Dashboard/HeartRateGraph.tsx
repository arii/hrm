// File: components/Dashboard/HeartRateGraph.tsx
'use client'
import { HeartRateGraphProps } from '@/types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const HeartRateGraph = ({ data }: HeartRateGraphProps) => {
  return (
    <div data-testid="heart-rate-graph" style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HeartRateGraph
