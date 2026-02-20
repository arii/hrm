// components/WorkoutTableViewer.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableContainer,
  TableHead,
  TableCell,
  Paper,
  CircularProgress,
  Typography,
  Alert,
  Box,
} from '@mui/material'
import RefreshIconButton from '@/components/RefreshIconButton'
import { WorkoutTableDto } from '@/types/workout'

interface WorkoutTableViewerProps {
  docId: string
  refreshKey?: number
  onRefresh?: () => void
}

export default function WorkoutTableViewer({
  docId,
  refreshKey,
  onRefresh,
}: WorkoutTableViewerProps) {
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

  const tableHeaderStyle = { fontWeight: 'bold' }
  const tableContainerStyle = { width: '100%' }
  const tableHeaderRowStyle = { backgroundColor: 'action.hover' }

  return (
    <Box sx={{ position: 'relative', ...tableContainerStyle }}>
      {onRefresh && (
        <RefreshIconButton
          onClick={onRefresh}
          aria-label="refresh workout table"
        />
      )}
      <TableContainer
        component={Paper}
        elevation={2}
        data-testid="workout-table-viewer"
      >
        <Table sx={{ minWidth: 650 }} aria-label="workout table">
          <TableHead sx={{ '& tr': tableHeaderRowStyle }}>
            <tr>
              {data.headers.map((header, index) => (
                <TableCell key={index} sx={tableHeaderStyle}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'inherit',
                      m: 0,
                    }}
                  >
                    {header}
                  </Typography>
                </TableCell>
              ))}
            </tr>
          </TableHead>
        </Table>
      </TableContainer>
    </Box>
  )
}
