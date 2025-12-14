/**
 * @jest-environment jsdom
 */
// File: tests/unit/components/HrTile.test.tsx
import { render, screen } from '@testing-library/react'
import HrTile from '@/components/HrTile'
import '@testing-library/jest-dom'

describe('HrTile', () => {
  it('should not render the workout data when showWorkoutData is false', () => {
    render(
      <HrTile
        name="Test"
        bpm={120}
        percentMax={60}
        isAlerting={false}
        showWorkoutData={false}
        caloriesBurned={123}
        workoutDuration="01:30"
      />
    )
    expect(screen.queryByText('123')).not.toBeInTheDocument()
    expect(screen.queryByText('kcal')).not.toBeInTheDocument()
    expect(screen.queryByText('01:30')).not.toBeInTheDocument()
  })

  it('should render the workout data when showWorkoutData is true and calories are present', () => {
    render(
      <HrTile
        name="Test"
        bpm={120}
        percentMax={60}
        isAlerting={false}
        showWorkoutData={true}
        caloriesBurned={123}
        workoutDuration="00:00"
      />
    )
    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('kcal')).toBeInTheDocument()
  })

  it('should render the workout data when showWorkoutData is true and duration is present', () => {
    render(
      <HrTile
        name="Test"
        bpm={120}
        percentMax={60}
        isAlerting={false}
        showWorkoutData={true}
        caloriesBurned={0}
        workoutDuration="01:30"
      />
    )
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })
})
