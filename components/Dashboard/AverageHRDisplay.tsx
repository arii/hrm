// components/Dashboard/AverageHRDisplay.tsx
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface AverageHRDisplayProps {
  avgHr: number;
}

const AverageHRDisplay: React.FC<AverageHRDisplayProps> = ({ avgHr }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          Average HR
        </Typography>
        <Typography variant="h3" component="p">
          {Math.round(avgHr)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          BPM
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AverageHRDisplay;
