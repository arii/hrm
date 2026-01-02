// utils/workout-helpers.ts
import {
  FitnessCenter,
  DirectionsRun,
  DirectionsBike,
  Pool,
  SelfImprovement,
  AccessibilityNew,
} from '@mui/icons-material'
import { ReactElement } from 'react'

const iconMapping: Record<string, ReactElement> = {
  run: <DirectionsRun />,
  sprint: <DirectionsRun />,
  bike: <DirectionsBike />,
  swim: <Pool />,
  yoga: <SelfImprovement />,
  stretch: <AccessibilityNew />,
  // Add more mappings as needed
}

export const getIconForExercise = (exerciseName: string): ReactElement => {
  const lowerCaseName = exerciseName.toLowerCase()
  for (const keyword in iconMapping) {
    if (lowerCaseName.includes(keyword)) {
      return iconMapping[keyword]!
    }
  }
  return <FitnessCenter /> // Default icon
}
