// src/components/Dashboard/LiveWorkoutTimerDisplay.tsx
'use client';

import { Card, CardContent, Typography } from '@mui/material';
import { useWebSocket } from '@/context/WebSocketContext';
import { useMemo } from 'react';

const LiveWorkoutTimerDisplay = () => {
  const { timerData } = useWebSocket();

  const formattedTime = useMemo(() => {
    const totalSeconds = timerData.timeElapsed;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [timerData.timeElapsed]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Workout Time</Typography>
        <Typography variant="h4">{formattedTime}</Typography>
      </CardContent>
    </Card>
  );
};

export default LiveWorkoutTimerDisplay;
