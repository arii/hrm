// app/client/experimental/components/CalorieTracker.tsx
import { Card, CardContent, Typography, Box } from '@mui/material'
import { CalorieDataPoint } from '@/lib/workout-session-storage'
import { useMemo } from 'react'

interface CalorieTrackerProps {
  calorieHistory: CalorieDataPoint[]
}

const CalorieTracker = ({ calorieHistory }: CalorieTrackerProps) => {
  const totalCalories = useMemo(() => {
    if (calorieHistory.length === 0) return 0
    // Get the latest total from the last data point
    const lastPoint = calorieHistory[calorieHistory.length - 1]
    return lastPoint?.totalToThisPoint ?? 0
  }, [calorieHistory])

  // Get the last data point for "current" burn rate
  const latestCalorieDataPoint =
    calorieHistory.length > 0 ? calorieHistory[calorieHistory.length - 1] : null

  // The caloriesPerSecond value is per second, so multiply by 60 for kcal/min
  const caloriesPerMinute = latestCalorieDataPoint
    ? latestCalorieDataPoint.caloriesPerSecond * 60
    : 0

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Calories Burned
        </Typography>
        <Box display="flex" justifyContent="space-around" textAlign="center">
          <Box>
            <Typography variant="h4">{totalCalories.toFixed(0)}</Typography>
            <Typography variant="caption">Total kCal</Typography>
          </Box>
          <Box>
            <Typography variant="h4">{caloriesPerMinute.toFixed(1)}</Typography>
            <Typography variant="caption">kCal / min</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default CalorieTracker
