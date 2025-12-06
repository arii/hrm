// components/WorkoutHistoryTable.tsx
import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import { WorkoutHistory } from '@/types'
import { HR_ZONES } from '@/utils/visualization'

interface WorkoutHistoryTableProps {
  history: WorkoutHistory
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${h}:${m}:${s}`
}

const WorkoutHistoryTable: React.FC<WorkoutHistoryTableProps> = ({
  history,
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Avg HR</TableCell>
            <TableCell>Calories</TableCell>
            {HR_ZONES.map((zone) => (
              <TableCell key={zone.name}>{zone.name}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map((session, index) => (
            <TableRow key={index}>
              <TableCell>
                {new Date(session.startTime).toLocaleDateString()}
              </TableCell>
              <TableCell>{formatDuration(session.durationInSeconds)}</TableCell>
              <TableCell>{session.averageHr} bpm</TableCell>
              <TableCell>{session.caloriesBurned}</TableCell>
              {HR_ZONES.map((zone) => (
                <TableCell key={zone.name}>
                  {formatDuration(session.timeInZones[zone.name] || 0)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default WorkoutHistoryTable
