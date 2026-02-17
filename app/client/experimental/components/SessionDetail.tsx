// app/client/experimental/components/SessionDetail.tsx
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Skeleton,
} from '@mui/material'
import dynamic from 'next/dynamic'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import { formatDate } from '@/lib/utils'
import ZoneDistribution from './ZoneDistribution'

const HeartRateTimeSeries = dynamic(() => import('./HeartRateTimeSeries'), {
  ssr: false,
  loading: () => (
    <Box sx={{ height: 300 }}>
      <Skeleton
        variant="rectangular"
        width="100%"
        height="100%"
        animation="wave"
      />
    </Box>
  ),
})

interface SessionDetailProps {
  session: WorkoutSessionData
  onBack: () => void
}

const SessionDetail = ({ session, onBack }: SessionDetailProps) => {
  const totalCalories =
    session.calorieHistory.length > 0
      ? (session.calorieHistory[session.calorieHistory.length - 1]
          ?.totalToThisPoint ?? 0)
      : 0
  const durationInSeconds = session.endTime
    ? (session.endTime - session.startTime) / 1000
    : 0
  const avgHr =
    session.hrHistory.reduce((sum, dp) => sum + dp.hr, 0) /
      session.hrHistory.length || 0

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Workout Details
        </Typography>
        <Button onClick={onBack} sx={{ mb: 2 }}>
          &larr; Back to List
        </Button>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Summary</Typography>
            <Typography>Date: {formatDate(session.startTime)}</Typography>
            <Typography>
              Duration: {(durationInSeconds / 60).toFixed(1)} mins
            </Typography>
            <Typography>
              Total Calories: {totalCalories.toFixed(0)} kCal
            </Typography>
            <Typography>Average HR: {avgHr.toFixed(0)} bpm</Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <ZoneDistribution
              timeInZones={session.timeInZones}
              totalDuration={durationInSeconds}
            />
          </Box>
        </Box>
        <HeartRateTimeSeries hrHistory={session.hrHistory} />
      </CardContent>
    </Card>
  )
}

export default SessionDetail
