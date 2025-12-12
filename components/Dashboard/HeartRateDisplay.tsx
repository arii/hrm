// src/components/Dashboard/HeartRateDisplay.tsx
'use client';

import { Card, CardContent, Typography } from '@mui/material';
import { useWebSocket } from '@/context/WebSocketContext';

const HeartRateDisplay = () => {
  const { hrmData } = useWebSocket();
  const latestHeartRate = hrmData.length > 0 ? hrmData[hrmData.length - 1].value : '...';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Live Heart Rate</Typography>
        <Typography variant="h4">{latestHeartRate} BPM</Typography>
      </CardContent>
    </Card>
  );
};

export default HeartRateDisplay;
