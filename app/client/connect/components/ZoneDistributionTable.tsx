'use client'
import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
} from '@mui/material'
import { formatDuration } from '@/utils/formatters'

interface ZoneDistributionTableProps {
  data: {
    zone: string
    duration: number
    percentage: number
    color: string
    bpmRange: string
  }[]
}

const ZoneDistributionTable: React.FC<ZoneDistributionTableProps> = ({
  data,
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Zone</TableCell>
            <TableCell>Range (BPM)</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>% of Session</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.zone}>
              <TableCell>
                <Box
                  sx={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    backgroundColor: row.color,
                    marginRight: 1,
                  }}
                />
                {row.zone}
              </TableCell>
              <TableCell>{row.bpmRange}</TableCell>
              <TableCell>{formatDuration(row.duration * 1000, 'mm:ss')}</TableCell>
              <TableCell>{row.percentage.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default ZoneDistributionTable
