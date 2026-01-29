// app/client/experimental/components/SessionDetail.tsx
import { Card, CardContent, Typography, Button, Box } from '@mui/material'
import { WorkoutSessionData } from '@/lib/sessionDataValidator'
import ZoneDistribution from './ZoneDistribution'
import HeartRateTimeSeries from './HeartRateTimeSeries'
import { useUserSettings } from '@/context/UserSettingsContext'

interface SessionDetailProps {
  session: WorkoutSessionData
  onBack: () => void
}

const SessionDetail = ({ session, onBack }: SessionDetailProps) => {
  const [userSettings] = useUserSettings()

  const totalCalories = session.calorieHistory.reduce(
    (total, dp) => total + dp.calories,
    0
  )
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

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Summary</Typography>
            <Typography>
              Date: {new Date(session.startTime).toLocaleDateString()}
            </Typography>
            <Typography>
              Duration: {(durationInSeconds / 60).toFixed(1)} mins
            </Typography>
            <Typography>Total Calories: {totalCalories.toFixed(0)} kCal</Typography>
            <Typography>Average HR: {avgHr.toFixed(0)} bpm</Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <ZoneDistribution
              timeInZones={session.timeInZones}
              userAge={userSettings.userAge}
            />
          </Box>
        </Box>
        <HeartRateTimeSeries hrHistory={session.hrHistory} />
      </CardContent>
    </Card>
  )
}

export default SessionDetail
