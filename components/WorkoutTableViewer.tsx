// File: components/WorkoutTableViewer.tsx
/**
 * Renders workout data fetched from the API as a native Material-UI table.
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
import { useWebSocket } from '../context/WebSocketContext'

import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import IconButton from '@mui/material/IconButton'

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
  const { workoutData } = useWebSocket()
  const data = workoutData || []
  const isLoading = workoutData === null
  const lastUpdated = new Date().toLocaleTimeString()

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
              Last Updated: {lastUpdated}
            </Typography>
          )}
        </Box>

        {isLoading && <Skeleton variant="rectangular" height={400} />}

        {error && (
          <Typography color="error" sx={{ my: 2 }}>
            Error: {error}
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
                    sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}
                  >
                    <TableCell component="th" scope="row">
                      {item.name}
                    </TableCell>
                    <TableCell align="right">{item.sets}</TableCell>
                  </TableRow>
                ))}
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
