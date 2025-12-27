
import { render, screen } from '@testing-library/react'
import WorkoutSummary from '../WorkoutSummary'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

jest.mock('@/hooks/useWorkoutSession', () => ({
  useWorkoutSession: jest.fn(),
}))

describe('WorkoutSummary', () => {
  it('should display workout calories when a workout has started', () => {
    ;(useWorkoutSession as jest.Mock).mockReturnValue({ hasStarted: true })
    render(
      <WorkoutSummary
        duration="01:00"
        caloriesBurned={100}
        totalCalories={500}
      />
    )
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Workout Calories')).toBeInTheDocument()
  })

  it('should display total calories when a workout has not started', () => {
    ;(useWorkoutSession as jest.Mock).mockReturnValue({ hasStarted: false })
    render(
      <WorkoutSummary
        duration="01:00"
        caloriesBurned={100}
        totalCalories={500}
      />
    )
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('Total Calories')).toBeInTheDocument()
  })
})
