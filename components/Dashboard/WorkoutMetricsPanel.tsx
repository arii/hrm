// components/Dashboard/WorkoutMetricsPanel.tsx
import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import RealTimeHRDisplay from './RealTimeHRDisplay';
import AverageHRDisplay from './AverageHRDisplay';
import MaxHRDisplay from './MaxHRDisplay';
import HeartRateZoneIndicator from './HeartRateZoneIndicator';
import HeartRateGraph from './HeartRateGraph';
import { HrmData } from '@/types/websocket';
import { HrmDataPoint, HrmSessionStats } from '@/context/WebSocketContext';

interface WorkoutMetricsPanelProps {
  user: HrmData;
  history: HrmDataPoint[];
  stats: HrmSessionStats;
}

const WorkoutMetricsPanel: React.FC<WorkoutMetricsPanelProps> = ({ user, history, stats }) => {
  if (!user) {
    return null;
  }

  return (
    <Paper data-testid="workout-metrics-panel" elevation={3} sx={{ p: 2, backgroundColor: 'background.paper' }}>
      <Typography variant="h4" gutterBottom component="div" sx={{ mb: 2 }}>
        {user.name}'s Workout Metrics
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <RealTimeHRDisplay bpm={user.value} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AverageHRDisplay avgHr={stats.avgHr} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MaxHRDisplay maxHr={stats.maxHr} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HeartRateZoneIndicator bpm={user.value} maxHr={user.maxHr} />
        </Grid>
        <Grid item xs={12}>
          <HeartRateGraph data={history} />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default WorkoutMetricsPanel;
