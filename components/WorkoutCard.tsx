// components/WorkoutCard.tsx
'use client'

import { Card, CardContent, Typography, IconButton, Box } from '@mui/material'
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material'
import { ReactNode } from 'react'

interface WorkoutCardProps {
  exerciseName: string
  details: string
  isCompleted: boolean
  onToggleComplete: () => void
  icon: ReactNode
}

export default function WorkoutCard({
  exerciseName,
  details,
  isCompleted,
  onToggleComplete,
  icon,
}: WorkoutCardProps) {
  return (
    <Card
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: isCompleted ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" mb={2}>
          {icon}
          <Typography variant="h6" component="div" sx={{ ml: 1 }}>
            {exerciseName}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          component="pre"
          sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
        >
          {details}
        </Typography>
      </CardContent>
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton onClick={onToggleComplete} aria-label="toggle complete">
          {isCompleted ? (
            <CheckCircle color="success" />
          ) : (
            <RadioButtonUnchecked />
          )}
        </IconButton>
      </Box>
    </Card>
  )
}
