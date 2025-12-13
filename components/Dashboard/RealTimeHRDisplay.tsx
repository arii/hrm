// components/Dashboard/RealTimeHRDisplay.tsx
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface RealTimeHRDisplayProps {
  bpm: number;
}

const RealTimeHRDisplay: React.FC<RealTimeHRDisplayProps> = ({ bpm }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          Heart Rate
        </Typography>
        <Typography variant="h3" component="p">
          {bpm}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          BPM
        </Typography>
      </CardContent>
    </Card>
  );
};

export default RealTimeHRDisplay;
