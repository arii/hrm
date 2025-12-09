// components/WorkoutTable.tsx
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
  IconButton,
  Box,
} from '@mui/material'
import { WorkoutData } from '@/types/index'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

interface WorkoutTableProps {
  workoutData: WorkoutData
}

const WorkoutTable: React.FC<WorkoutTableProps> = ({ workoutData }) => {
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)
  const [isShrunk, setIsShrunk] = React.useState(false)

  React.useEffect(() => {
    if (workoutData && workoutData.length > 0) {
      setLastUpdated(new Date())
    }
  }, [workoutData])

  const maxExercises = React.useMemo(() => {
    if (isShrunk) return 1
    if (!workoutData || workoutData.length === 0) return 0
    return Math.max(...workoutData.map((col) => col.exercises.length))
  }, [workoutData, isShrunk])

  return (
    <Paper elevation={3} sx={{ position: 'relative' }}>
      <Typography variant="h6" style={{ padding: '16px' }}>
        Workout Data
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {workoutData.map((col, index) => (
                <TableCell key={index} style={{ fontWeight: 'bold' }}>
                  {col.category}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: maxExercises }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {workoutData.map((col, colIndex) => (
                  <TableCell key={colIndex}>
                    {col.exercises[rowIndex] && (
                      <Typography variant="body2">
                        {col.exercises[rowIndex]}
                      </Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1,
        }}
      >
        {lastUpdated && (
          <Typography variant="caption" style={{ padding: '8px' }}>
            Last Updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
        )}
        <IconButton
          onClick={() => setIsShrunk(!isShrunk)}
          sx={{
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
      </Box>
    </Paper>
  )
}

export default WorkoutTable
