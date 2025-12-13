// components/Dashboard/MaxHRDisplay.tsx
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface MaxHRDisplayProps {
  maxHr: number;
}

const MaxHRDisplay: React.FC<MaxHRDisplayProps> = ({ maxHr }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          Max HR
        </Typography>
        <Typography variant="h3" component="p">
          {maxHr}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          BPM
        </Typography>
      </CardContent>
    </Card>
  );
};

export default MaxHRDisplay;
