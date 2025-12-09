// utils/visualization.ts
import { WorkoutData } from '@/types/index'
import { WorkoutColumnsProps } from '@/components/WorkoutColumns'

export const transformWorkoutDataToColumns = (
  data: WorkoutData
): WorkoutColumnsProps['columns'] => {
  if (!data) return []

  return data.map((category) => ({
    title: category.category, // Map 'category' -> 'title'
    items: category.exercises.map((ex) => ({
      title: ex, // Map string -> object.title
      details: undefined, // Optional details field
    })),
  }))
}
