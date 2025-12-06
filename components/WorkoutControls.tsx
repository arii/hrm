// File: components/WorkoutControls.tsx
import React from 'react';
import { Button, Box } from '@mui/material';
import { useWebSocket } from '@/context/WebSocketContext';
import { useUserSettings } from '@/context/UserSettingsContext';

const WorkoutControls: React.FC = () => {
  const { timerData, send } = useWebSocket();
  const [userSettings] = useUserSettings();

  const handleStart = () => {
    send({ type: 'TIMER_COMMAND', payload: { command: 'START', userSettings } });
  };

  const handleStop = () => {
    send({ type: 'TIMER_COMMAND', payload: { command: 'STOP' } });
  };

  return (
    <Box sx={{ textAlign: 'center', mt: 2 }}>
      <Box sx={{ '& > :not(style)': { m: 1 } }}>
        <Button variant="contained" color="primary" onClick={handleStart} disabled={timerData.isRunning}>
          Start Workout
        </Button>
        <Button variant="contained" color="secondary" onClick={handleStop} disabled={!timerData.isRunning}>
          Stop Workout
        </Button>
      </Box>
    </Box>
  );
};

export default WorkoutControls;
