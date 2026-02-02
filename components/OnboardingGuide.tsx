// components/OnboardingGuide.tsx
import React from 'react';
import { Stepper, Step, StepLabel, Typography, Box } from '@mui/material';

const steps = [
  'Connect your Heart Rate Monitor',
  'See your heart rate in real-time',
  'Start a workout',
];

export const OnboardingGuide = () => {
  return (
    <Box sx={{ width: '100%', p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom align="center">
            Welcome! Let's get you started.
        </Typography>
      <Stepper activeStep={0} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};
