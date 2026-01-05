'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { useUserSettings } from '@/context/UserSettingsContext';
import { Button, Typography, Paper, Box, Container } from '@mui/material';
import { generateFitFile } from '@/lib/export/fit-generator';
import Main from '@/app/main';

const ExperimentalWorkoutPage = () => {
  const webSocketContext = useWebSocket();
  const { userSettings } = useUserSettings();
  const [workoutBuffer, setWorkoutBuffer] = useState<Array<{ time: number; hr: number }>>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState<number>(0);
  const [caloriesBurned, setCaloriesBurned] = useState<number>(0);

  useEffect(() => {
    if (!webSocketContext) return;

    const { hrmData, timerData } = webSocketContext;

    if (timerData.isRunning && !sessionStartTime) {
      setSessionStartTime(Date.now());
    }

    if (timerData.isRunning && hrmData.length > 0 && hrmData[0].lastKnownHr !== null) {
      const latestHr = hrmData[0].lastKnownHr;
      setWorkoutBuffer((prevBuffer) => [
        ...prevBuffer,
        { time: Date.now(), hr: latestHr },
      ]);
    }

    if (!timerData.isRunning && sessionStartTime) {
      setWorkoutDuration(timerData.timeElapsed);
      setCaloriesBurned(timerData.caloriesBurned);
    }
  }, [webSocketContext, sessionStartTime]);

  const handleExport = () => {
    if (workoutBuffer.length === 0 || !sessionStartTime) return;

    const blob = generateFitFile({
      startTime: sessionStartTime,
      durationSeconds: workoutDuration,
      totalCalories: caloriesBurned,
      records: workoutBuffer,
      userWeight: userSettings.weight,
      userAge: userSettings.age,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-${new Date().toISOString()}.fit`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const timerData = webSocketContext?.timerData;

  return (
    <Main>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h4" gutterBottom>
            Workout Summary
          </Typography>
          {!webSocketContext ? (
            <Typography>Loading...</Typography>
          ) : (
            <Box>
              <Typography>Duration: {workoutDuration.toFixed(2)} seconds</Typography>
              <Typography>Calories Burned: {caloriesBurned.toFixed(2)}</Typography>
              <Typography>Data Points Recorded: {workoutBuffer.length}</Typography>
            </Box>
          )}
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={workoutBuffer.length === 0 || !timerData || timerData.isRunning}
            sx={{ mt: 2 }}
          >
            Download FIT File
          </Button>
        </Paper>
      </Container>
    </Main>
  );
};

export default ExperimentalWorkoutPage;
