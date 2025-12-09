// File: components/WorkoutTable.tsx
/**
 * Workout Table Component: Fetches workout data from the API and renders it in a Material-UI Table.
 */
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { memo, useEffect, useState } from 'react'
import { WorkoutItem } from '@/utils/googleDocParser'

interface WorkoutTableProps {
  isShrunk?: boolean
}

const WorkoutTable = ({ isShrunk = false }: WorkoutTableProps) => {
  const [data, setData] = useState<WorkoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/workout-data')
        if (!response.ok) {
          throw new Error('Failed to fetch workout data')
        }
        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData() // Initial fetch
    const intervalId = setInterval(fetchData, 30000) // Poll every 30 seconds

    return () => clearInterval(intervalId) // Cleanup on unmount
  }, [])

  const displayedData = isShrunk ? data.slice(0, 5) : data

  if (loading) {
    return <Skeleton variant="rectangular" height={isShrunk ? 200 : 500} />
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={isShrunk ? 200 : 500}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <TableContainer component={Paper} elevation={6} sx={{ height: isShrunk ? 'auto' : 500 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>Category</TableCell>
            <TableCell>Exercise</TableCell>
            <TableCell>Sets</TableCell>
            <TableCell>Reps</TableCell>
            <TableCell>Tempo</TableCell>
            <TableCell>Rest</TableCell>
            <TableCell>RPE</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.category}</TableCell>
              <TableCell>{row.exercise}</TableCell>
              <TableCell>{row.sets}</TableCell>
              <TableCell>{row.reps}</TableCell>
              <TableCell>{row.tempo}</TableCell>
              <TableCell>{row.rest}</TableCell>
              <TableCell>{row.rpe}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default memo(WorkoutTable)
