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
  IconButton,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { alpha } from '@mui/material/styles'
import { WorkoutTableDto } from '@/types/workout'

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
        setError(null) // Reset error on re-fetch
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
      {onRefresh && (
        <IconButton
          onClick={onRefresh}
          aria-label="refresh workout table"
          data-testid="refresh-icon-button"
          sx={(theme) => ({
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            backgroundColor: alpha(theme.palette.background.paper, 0.7),
            backdropFilter: 'blur(4px)',
            '&:hover': {
              backgroundColor: alpha(theme.palette.background.paper, 0.9),
            },
            width: 48,
            height: 48,
          })}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
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
                <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
    </Box>
  )
}
