// File: components/WorkoutTableViewer.tsx
/**
 * Renders workout data fetched from the API as a native Material-UI table.
 * Refactored to use REST API instead of WebSocket for static data efficiency.
 */
'use client'

import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import IconButton from '@mui/material/IconButton'

// Define the shape of the data based on your API response
interface WorkoutItem {
  name: string
  sets: string
}

interface WorkoutTableViewerProps {
  title: string
  isShrunk?: boolean
  onToggleShrink?: () => void
}

const WorkoutTableViewer = ({
  title,
  isShrunk = false,
  onToggleShrink,
}: WorkoutTableViewerProps) => {
  // State management for API data
  const [data, setData] = useState<WorkoutItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/workout')

        if (!res.ok) {
          throw new Error(`Failed to fetch workout: ${res.statusText}`)
        }

        const jsonData = await res.json()
        setData(jsonData)
        setLastUpdated(new Date().toLocaleTimeString())
        setError(null)
      } catch (err) {
        console.error('Error loading workout:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkout()
  }, [])

  return (
    <Card elevation={6}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Fetched: {lastUpdated}
            </Typography>
          )}
        </Box>

        {isLoading && <Skeleton variant="rectangular" height={400} />}

        {error && (
          <Typography color="error" sx={{ my: 2 }}>
            Error loading regimen: {error}
          </Typography>
        )}

        {!isLoading && !error && (
          <TableContainer
            sx={{
              maxHeight: isShrunk ? 200 : 500,
              transition: 'max-height 0.3s ease-in-out',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Exercise</TableCell>
                  <TableCell align="right">Sets / Reps</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(isShrunk ? data.slice(0, 5) : data).map((item, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {item.name}
                    </TableCell>
                    <TableCell align="right">{item.sets}</TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      No workout data found in the linked document.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {onToggleShrink && (
          <IconButton
            onClick={onToggleShrink}
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              backgroundColor: 'rgba(255,255,255,0.9)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,1)',
              },
              zIndex: 10,
            }}
            aria-label={isShrunk ? 'Expand document' : 'Collapse document'}
          >
            {isShrunk ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        )}
      </CardContent>
    </Card>
  )
}

export default WorkoutTableViewer
