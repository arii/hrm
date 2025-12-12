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
import { format } from 'date-fns'
import { useTheme } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { useMemo } from 'react'

const HeartRateGraph = ({ data }: HeartRateGraphProps) => {
  const theme = useTheme()

  const formatXAxisTick = (tick: number) => {
    return format(new Date(tick), 'HH:mm:ss')
  }

  const filteredData = useMemo(() => {
    return data.filter(
      (point) => typeof point.value === 'number' && !isNaN(point.value)
    )
  }, [data])

  if (filteredData.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="region"
        aria-label="Heart Rate Graph"
      >
        <Typography variant="body1" color="text.secondary">
          No heart rate data available.
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      data-testid="heart-rate-graph"
      sx={{ width: '100%', height: 200 }}
      role="region"
      aria-label="Heart Rate Graph"
    >
      <ResponsiveContainer>
        <LineChart
          data={filteredData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          aria-label="A line chart showing heart rate data over the last 60 seconds."
        >
          <XAxis dataKey="timestamp" tickFormatter={formatXAxisTick} />
          <YAxis domain={[0, 'dataMax + 10']} />
          <Tooltip isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={theme.palette.primary.main}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default HeartRateGraph
