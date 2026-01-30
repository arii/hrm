// app/client/analytics/components/SessionDetail.tsx
import { Card, CardContent, Typography, Button, Box } from '@mui/material'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import ZoneDistributionChart from '@/components/analytics/ZoneDistributionChart'
import HeartRateTimeSeries from './HeartRateTimeSeries'

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
            <Typography>
              Date: {new Date(session.startTime).toLocaleDateString()}
            </Typography>
            <Typography>
              Duration: {(durationInSeconds / 60).toFixed(1)} mins
            </Typography>
            <Typography>
              Total Calories: {totalCalories.toFixed(0)} kCal
            </Typography>
            <Typography>Average HR: {avgHr.toFixed(0)} bpm</Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <ZoneDistributionChart
              timeInZones={session.timeInZones}
              status={'idle'}
              isLive={false}
            />
          </Box>
        </Box>
        <HeartRateTimeSeries hrHistory={session.hrHistory} />
      </CardContent>
    </Card>
  )
}

export default SessionDetail
