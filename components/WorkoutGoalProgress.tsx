// components/WorkoutGoalProgress.tsx
import React from 'react'
import { Box, Typography, LinearProgress, LinearProgressProps } from '@mui/material'

interface WorkoutGoalProgressProps {
  currentProgress: number
  targetGoal: number
  label: string
}

function LinearProgressWithLabel(props: LinearProgressProps & { value: number; current: number; target: number, label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ textAlign: 'left' }}>
          {props.label}
        </Typography>
        <LinearProgress variant="determinate" {...props} sx={{ height: 10, borderRadius: 5 }}/>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">{`${props.current}`}</Typography>
            <Typography variant="body2" color="text.secondary">{`${props.target}`}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

const WorkoutGoalProgress: React.FC<WorkoutGoalProgressProps> = ({ currentProgress, targetGoal, label }) => {
  const normalise = (value: number) => (value - 0) * 100 / (targetGoal - 0);
  const progressValue = normalise(Math.min(currentProgress, targetGoal));

  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgressWithLabel value={progressValue} current={currentProgress} target={targetGoal} label={label}/>
    </Box>
  )
}

export default WorkoutGoalProgress
