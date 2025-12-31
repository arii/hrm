// app/history/page.tsx
'use client'

import useSWR from 'swr'
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Workout } from '../../types'
import BottomNavBar from '../../components/BottomNavBar'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function HistoryPage() {
  const { data: workouts, error } = useSWR<Workout[]>('/api/workouts', fetcher)

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

  return (
    <>
      <Container maxWidth="md" sx={{ py: 3, pb: 10 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Workout History
        </Typography>

        {error && <Alert severity="error">Failed to load workout data.</Alert>}
        {!workouts && !error && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '2rem',
            }}
          >
            <CircularProgress />
          </div>
        )}
        {workouts && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Duration</TableCell>
                  <TableCell align="right">Calories Burned</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workouts.map((workout) => (
                  <TableRow key={workout.id}>
                    <TableCell>{workout.userName}</TableCell>
                    <TableCell>
                      {new Date(workout.startTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      {formatDuration(workout.duration)}
                    </TableCell>
                    <TableCell align="right">
                      {workout.caloriesBurned}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
      <BottomNavBar />
    </>
  )
}
