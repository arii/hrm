// src/components/Dashboard/AverageHeartRateDisplay.tsx
'use client';

import { Card, CardContent, Typography } from '@mui/material';
import { useWebSocket } from '@/context/WebSocketContext';
import { useMemo } from 'react';

const AverageHeartRateDisplay = () => {
  const { hrmData } = useWebSocket();

  const averageHeartRate = useMemo(() => {
    if (hrmData.length === 0) {
      return '...';
    }
    const sum = hrmData.reduce((acc, data) => acc + data.value, 0);
    return Math.round(sum / hrmData.length);
  }, [hrmData]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Average Heart Rate</Typography>
        <Typography variant="h4">{averageHeartRate} BPM</Typography>
      </CardContent>
    </Card>
  );
};

export default AverageHeartRateDisplay;
