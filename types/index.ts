// types/index.ts
export type Gender = 'male' | 'female'

export type MeasurementSystem = 'METRIC' | 'IMPERIAL'

export interface WorkoutColumnItem {
  title: string
}

export interface WorkoutItem {
  category: string
  exercises: string[]
}

export type WorkoutData = WorkoutItem[]
