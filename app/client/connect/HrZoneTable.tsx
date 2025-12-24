// app/client/connect/HrZoneTable.tsx
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
  Typography,
} from '@mui/material'
import { HrZoneData } from '@/hooks/useBluetoothHRM'
import { HR_ZONE_DEFINITIONS } from '@/utils/visualization'
import { formatDuration } from '@/lib/utils'

interface HrZoneTableProps {
  zoneDurations: HrZoneData
}

const HrZoneTable: React.FC<HrZoneTableProps> = ({ zoneDurations }) => {
  return (
    <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Time in Heart Rate Zones
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Zone</TableCell>
              <TableCell>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {HR_ZONE_DEFINITIONS.map((zone) => (
              <TableRow key={zone.name}>
                <TableCell>{zone.name}</TableCell>
                <TableCell>
                  {formatDuration((zoneDurations[zone.name] || 0) / 1000)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

export default HrZoneTable
