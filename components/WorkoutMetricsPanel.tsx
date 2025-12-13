import React from 'react'
import { Paper, Grid } from '@mui/material'
import TimerDisplay from './TimerDisplay'
import HeartRateDisplay from './HeartRateDisplay'
import AverageHeartRateDisplay from './AverageHeartRateDisplay'
import MaxHeartRateDisplay from './MaxHeartRateDisplay'
import CaloriesBurnedDisplay from './CaloriesBurnedDisplay'
import { TimerData } from '../types/websocket'

interface WorkoutMetricsPanelProps {
  timerData: TimerData
  bpm: number | null
  avgBpm: number | null
  maxBpm: number | null
  calories: number | null
}

const WorkoutMetricsPanel: React.FC<WorkoutMetricsPanelProps> = ({
  timerData,
  bpm,
  avgBpm,
  maxBpm,
  calories,
}) => {
  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            timeElapsed={timerData.timeElapsed}
            mode={timerData.mode}
            workDuration={timerData.workDuration}
            restDuration={timerData.restDuration}
            soundEventId={timerData.soundEventId}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <HeartRateDisplay bpm={bpm} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <AverageHeartRateDisplay avgBpm={avgBpm} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <MaxHeartRateDisplay maxBpm={maxBpm} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <CaloriesBurnedDisplay calories={calories} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default WorkoutMetricsPanel
