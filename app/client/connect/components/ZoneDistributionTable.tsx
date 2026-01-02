'use client'

import React, { memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material'
import { formatDuration } from '@/lib/utils'

interface ZoneDistributionTableProps {
  zoneDistribution: {
    zone: string
    range: string
    duration: number
    percentage: number
  }[]
}

const ZoneDistributionTable: React.FC<ZoneDistributionTableProps> = ({
  zoneDistribution,
}) => {
  return (
    <TableContainer component={Paper} sx={{ mt: 4 }}>
      <Typography variant="h6" align="center" sx={{ p: 2 }}>
        Zone Distribution
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Zone</TableCell>
            <TableCell align="right">Range (BPM)</TableCell>
            <TableCell align="right">Duration</TableCell>
            <TableCell align="right">% of Session</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {zoneDistribution.map((row) => (
            <TableRow key={row.zone}>
              <TableCell component="th" scope="row">
                {row.zone}
              </TableCell>
              <TableCell align="right">{row.range}</TableCell>
              <TableCell align="right">
                {formatDuration(row.duration)}
              </TableCell>
              <TableCell align="right">{`${row.percentage.toFixed(
                1
              )}%`}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default memo(ZoneDistributionTable)
