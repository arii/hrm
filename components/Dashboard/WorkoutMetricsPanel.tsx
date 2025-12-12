// src/components/Dashboard/WorkoutMetricsPanel.tsx
'use client'

import { Card, CardContent, Grid, Typography } from '@mui/material'
import HeartRateDisplay from './HeartRateDisplay'
import AverageHeartRateDisplay from './AverageHeartRateDisplay'
import MaxHeartRateDisplay from './MaxHeartRateDisplay'
import CaloriesBurnedDisplay from './CaloriesBurnedDisplay'
import LiveWorkoutTimerDisplay from './LiveWorkoutTimerDisplay'

const WorkoutMetricsPanel = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div" sx={{ mb: 2 }}>
          Workout Metrics
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <HeartRateDisplay />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <AverageHeartRateDisplay />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <MaxHeartRateDisplay />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <CaloriesBurnedDisplay />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <LiveWorkoutTimerDisplay />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default WorkoutMetricsPanel
