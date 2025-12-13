// components/WorkoutMetricsPanel.tsx
import React from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';

import TimerDisplay from './TimerDisplay';
import HeartRateDisplay from './HeartRateDisplay';
import AverageHeartRateDisplay from './AverageHeartRateDisplay';
import MaxHeartRateDisplay from './MaxHeartRateDisplay';
import CaloriesBurnedDisplay from './CaloriesBurnedDisplay';
import { TimerData } from '@/types/websocket';

interface WorkoutMetricsPanelProps {
  timerData: TimerData;
}

const WorkoutMetricsPanel: React.FC<WorkoutMetricsPanelProps> = ({ timerData }) => {
  return (
    <Paper elevation={2} sx={{ p: 2 }}>
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
              <HeartRateDisplay />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <AverageHeartRateDisplay />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <MaxHeartRateDisplay />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <CaloriesBurnedDisplay />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default WorkoutMetricsPanel;
