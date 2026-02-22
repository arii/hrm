'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  Paper,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material'
import { WorkoutTableDto } from '@/types/workout'
import RefreshIconButton from './RefreshIconButton'

interface WorkoutTableHeaderProps {
  docId: string
  refreshKey?: number
  onRefresh?: () => void
}

export default function WorkoutTableHeader({
  docId,
  refreshKey,
  onRefresh,
}: WorkoutTableHeaderProps) {
  const [data, setData] = useState<WorkoutTableDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
<<<<<<< HEAD
        setError(null) // Reset error on re-fetch
=======
        setError(null)
>>>>>>> origin/leader
        const res = await fetch(`/api/workout?docId=${docId}`)
        if (!res.ok) throw new Error('Failed to load workout data')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (docId) {
      fetchData()
    }
  }, [docId, refreshKey])

<<<<<<< HEAD
  return (
    <Box sx={{ position: 'relative' }}>
=======
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!data || data.headers.length === 0) {
    return (
      <Alert severity="info">No workout data found in this document.</Alert>
    )
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
>>>>>>> origin/leader
      {onRefresh && (
        <RefreshIconButton
          onClick={onRefresh}
          aria-label="refresh workout table"
<<<<<<< HEAD
        />
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !data || data.headers.length === 0 ? (
        <Alert severity="info">No workout data found in this document.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          elevation={2}
          data-testid="workout-table-header"
        >
          <Table aria-label="workout table">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                {data.headers.map((header, index) => (
                  <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
          </Table>
        </TableContainer>
      )}
=======
          data-testid="refresh-icon-button"
        />
      )}
      <TableContainer
        component={Paper}
        elevation={2}
        data-testid="workout-table-header"
      >
        <Table sx={{ minWidth: 650 }} aria-label="workout table">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              {data.headers.map((header, index) => (
                <TableCell key={index} sx={{ fontWeight: 'bold' }} scope="col">
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
>>>>>>> origin/leader
    </Box>
  )
}
