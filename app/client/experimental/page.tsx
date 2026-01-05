// app/client/experimental/page.tsx
'use client';
import { Container, Box, Typography, Button } from '@mui/material';
import { useLocalWorkoutBuffer } from '@/hooks/useLocalWorkoutBuffer';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useWebSocket } from '@/context/WebSocketContext';
import WorkoutMetricGrid from '@/components/analytics/WorkoutMetricGrid';
import HeartRateTimeSeries from '@/components/analytics/HeartRateTimeSeries';
import ZoneDistributionChart from '@/components/analytics/ZoneDistributionChart';

const ExperimentalAnalyticsPage = () => {
  const { hrmData, connectionStatus } = useWebSocket();

  // TODO: Replace this with a user-selected device
  const selectedDevice = hrmData?.[0];

  const { workoutStatus, startWorkout, endWorkout, workoutDuration, caloriesBurned } = useWorkoutSession({
    isConnected: connectionStatus === 'Connected',
    totalCalories: selectedDevice?.calories || 0,
  });

  const currentHr = selectedDevice?.value || 0;
  const { buffer, clearBuffer } = useLocalWorkoutBuffer(currentHr, workoutStatus);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Experimental Workout Analytics
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={startWorkout}
          disabled={workoutStatus === 'running'}
        >
          Start Workout
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={endWorkout}
          disabled={workoutStatus !== 'running'}
        >
          End Workout
        </Button>
        <Button variant="outlined" color="warning" onClick={clearBuffer}>
          Clear Workout Data
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <WorkoutMetricGrid
            workoutDuration={workoutDuration}
            caloriesBurned={caloriesBurned}
          />
        </Box>
        <Box>
          <HeartRateTimeSeries data={buffer} />
        </Box>
        <Box>
          <ZoneDistributionChart data={buffer} />
        </Box>
      </Box>
    </Container>
  );
};

export default ExperimentalAnalyticsPage;
