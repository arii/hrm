// src/components/Dashboard/CaloriesBurnedDisplay.tsx
'use client';

import { Card, CardContent, Typography } from '@mui/material';

const CaloriesBurnedDisplay = () => {
  // Placeholder for calorie calculation logic
  const caloriesBurned = '...';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Calories Burned</Typography>
        <Typography variant="h4">{caloriesBurned} kcal</Typography>
      </CardContent>
    </Card>
  );
};

export default CaloriesBurnedDisplay;
