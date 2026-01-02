// File: app/client/connect/PerformanceDashboard.tsx
'use client'

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { formatDuration } from '@/lib/utils'
import { HrZoneDuration } from '@/hooks/useHrZoneTracker'

interface PerformanceDashboardProps {
  hrHistory: { time: number; hr: number }[]
  zoneDurations: HrZoneDuration[]
}

const PerformanceDashboard = ({
  hrHistory,
  zoneDurations,
}: PerformanceDashboardProps) => {
  const startTime = hrHistory.length > 0 && hrHistory[0] ? hrHistory[0].time : 0
  const chartData = hrHistory.map((d) => ({
    time: (d.time - startTime) / 1000, // Convert to seconds from start
    hr: d.hr,
  }))

  return (
    <Box mt={4}>
      <Typography variant="h5" gutterBottom>
        Performance Dashboard
      </Typography>

      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          HR vs. Time
        </Typography>
        {hrHistory.length === 0 ? (
          <Typography>No data yet. Start your workout!</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <XAxis
                dataKey="time"
                tickFormatter={(tick) => formatDuration(tick)}
              />
              <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip
                labelFormatter={(label) => `Time: ${formatDuration(label)}`}
                formatter={(value) => [`${value} BPM`, 'HR']}
              />
              <Area
                type="monotone"
                dataKey="hr"
                stroke="#8884d8"
                fill="#8884d8"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Zone Durations
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Zone</TableCell>
                <TableCell align="right">Duration</TableCell>
                <TableCell align="right">% of Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {zoneDurations.map((zone) => (
                <TableRow key={zone.zone}>
                  <TableCell component="th" scope="row">
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: zone.color,
                          mr: 1,
                          borderRadius: '50%',
                        }}
                      />
                      {zone.name}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {formatDuration(zone.duration)}
                  </TableCell>
                  <TableCell align="right">
                    {zone.percentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}

export default PerformanceDashboard
