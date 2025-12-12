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

const HeartRateGraph = ({ data }: HeartRateGraphProps) => {
  const theme = useTheme()

  const formatXAxisTick = (tick: number) => {
    return format(new Date(tick), 'HH:mm:ss')
  }

  if (data.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
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
    >
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
