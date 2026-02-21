'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material'
import RefreshIconButton from '@/components/RefreshIconButton'

interface WorkoutData {
  headers: string[]
  rows: string[][]
}

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
  const [data, setData] = useState<WorkoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
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
      {onRefresh && (
        <RefreshIconButton
          onClick={onRefresh}
          aria-label="refresh workout table"
        />
      )}
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
          <TableBody />
        </Table>
      </TableContainer>
    </Box>
  )
}
