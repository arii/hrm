// components/WorkoutGoalProgress.tsx
import React from 'react'
import {
  Box,
  Typography,
  LinearProgress,
  LinearProgressProps,
} from '@mui/material'

interface WorkoutGoalProgressProps {
  currentProgress: number
  targetGoal: number
  label: string
}

function LinearProgressWithLabel(
  props: LinearProgressProps & {
    value: number
    current: number
    target: number
    label: string
  }
) {
  const labelId = React.useId()
  const currentValueId = React.useId()
  const targetValueId = React.useId()

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          gutterBottom
          sx={{ textAlign: 'left' }}
          id={labelId}
        >
          {props.label}
        </Typography>
        <LinearProgress
          variant="determinate"
          {...props}
          sx={{ height: 8, borderRadius: 8 }}
          aria-labelledby={labelId}
          aria-describedby={`${currentValueId} ${targetValueId}`}
          aria-valuenow={props.current}
          aria-valuemin={0}
          aria-valuemax={props.target}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography
            variant="body2"
            color="text.secondary"
            id={currentValueId}
          >{`${props.current}`}</Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            id={targetValueId}
          >{`${props.target}`}</Typography>
        </Box>
      </Box>
    </Box>
  )
}

const WorkoutGoalProgress: React.FC<WorkoutGoalProgressProps> = ({
  currentProgress,
  targetGoal,
  label,
}) => {
  if (targetGoal <= 0) {
    console.warn(
      'WorkoutGoalProgress: targetGoal must be greater than 0. Rendering 0% progress.'
    )
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgressWithLabel
          value={0}
          current={0}
          target={targetGoal}
          label={label}
        />
      </Box>
    )
  }

  const safeCurrentProgress = Math.max(0, currentProgress)
  const normalise = (value: number) => (value * 100) / targetGoal
  const progressValue = normalise(Math.min(safeCurrentProgress, targetGoal))

  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgressWithLabel
        value={progressValue}
        current={safeCurrentProgress}
        target={targetGoal}
        label={label}
      />
    </Box>
  )
}

export default WorkoutGoalProgress
