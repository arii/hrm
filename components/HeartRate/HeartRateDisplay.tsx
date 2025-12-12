import React from 'react';
import { Typography } from '@mui/material';

interface HeartRateDisplayProps {
  bpm: number | null;
}

const HeartRateDisplay: React.FC<HeartRateDisplayProps> = ({ bpm }) => {
  return (
    <Typography variant="h4" component="div">
      {bpm !== null ? bpm : '--'}
    </Typography>
  );
};

export default HeartRateDisplay;
