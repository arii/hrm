// components/WorkoutTableViewer.tsx
'use client'

import React, { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
  Alert,
  Box,
} from '@mui/material'

interface WorkoutData {
  headers: string[]
  rows: string[][]
}

interface WorkoutTableViewerProps {
  docId: string
}

export default function WorkoutTableViewer({ docId }: WorkoutTableViewerProps) {
  const [data, setData] = useState<WorkoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
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
  }, [docId])

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

  if (!data || (data.headers.length === 0 && data.rows.length === 0)) {
    return (
      <Alert severity="info">No workout data found in this document.</Alert>
    )
  }

  return (
    <TableContainer component={Paper} elevation={2}>
      <Table sx={{ minWidth: 650 }} aria-label="workout table">
        {/* Render Headers */}
        {data.headers.length > 0 && (
          <TableHead>
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              {data.headers.map((header, index) => (
                <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}

        {/* Render Data Rows */}
        <TableBody>
          {data.rows.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} sx={{ verticalAlign: 'top' }}>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      m: 0,
                    }}
                  >
                    {cell}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
