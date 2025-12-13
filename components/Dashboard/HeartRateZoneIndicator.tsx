// components/Dashboard/HeartRateZoneIndicator.tsx
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { getHrZoneProps } from '@/utils/visualization';

interface HeartRateZoneIndicatorProps {
  bpm: number;
  maxHr: number;
}

const HeartRateZoneIndicator: React.FC<HeartRateZoneIndicatorProps> = ({ bpm, maxHr }) => {
  const zoneProps = getHrZoneProps(bpm, maxHr);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          Heart Rate Zone
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: zoneProps.color, mr: 1 }} aria-hidden="true" />
          <Typography variant="h4" component="p">
            {zoneProps.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {zoneProps.percentage}% of Max HR
        </Typography>
      </CardContent>
    </Card>
  );
};

export default HeartRateZoneIndicator;
