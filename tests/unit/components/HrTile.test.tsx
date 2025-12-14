/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import HrTile from '@/components/HrTile'

// Mock the theme
const theme = createTheme()

// Mock the WorkoutDataDisplay component to simplify testing
jest.mock('@/components/WorkoutDataDisplay', () => {
  return jest.fn(({ calories, duration }) => (
    <div data-testid="workout-data-display">
      <span>{calories}</span>
      <span>{duration}</span>
    </div>
  ))
})

describe('HrTile', () => {
  // Basic rendering tests from original intent (if any)
  it('renders the basic HR information', () => {
    render(
      <ThemeProvider theme={theme}>
        <HrTile name="Test User" bpm={120} percentMax={60} />
      </ThemeProvider>
    )
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('120 BPM')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  describe('HrTile - Workout Data Display', () => {
    it('shows workout data when showWorkoutData=true and calories > 0', () => {
      render(
        <ThemeProvider theme={theme}>
          <HrTile
            name="Test"
            bpm={120}
            percentMax={60}
            isAlerting={false}
            caloriesBurned={150}
            workoutDuration="01:30"
            showWorkoutData={true}
          />
        </ThemeProvider>
      )
      const workoutDisplay = screen.getByTestId('workout-data-display')
      expect(workoutDisplay).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('01:30')).toBeInTheDocument()
    })

    it('shows workout data even with 0 calories if duration exists', () => {
      render(
        <ThemeProvider theme={theme}>
          <HrTile
            name="Test"
            bpm={120}
            percentMax={60}
            isAlerting={false}
            caloriesBurned={0}
            workoutDuration="00:05"
            showWorkoutData={true}
          />
        </ThemeProvider>
      )
      // Should still render because workoutDuration is present
      const workoutDisplay = screen.getByTestId('workout-data-display')
      expect(workoutDisplay).toBeInTheDocument()
      expect(screen.getByText('00:05')).toBeInTheDocument()
    })

    it('hides workout data when showWorkoutData=false', () => {
      render(
        <ThemeProvider theme={theme}>
          <HrTile
            name="Test"
            bpm={120}
            percentMax={60}
            isAlerting={false}
            caloriesBurned={150}
            workoutDuration="01:30"
            showWorkoutData={false}
          />
        </ThemeProvider>
      )
      expect(
        screen.queryByTestId('workout-data-display')
      ).not.toBeInTheDocument()
    })

    it('hides workout data if calories are 0 and duration is missing', () => {
      render(
        <ThemeProvider theme={theme}>
          <HrTile
            name="Test"
            bpm={120}
            percentMax={60}
            isAlerting={false}
            caloriesBurned={0}
            workoutDuration={undefined}
            showWorkoutData={true}
          />
        </ThemeProvider>
      )
      expect(
        screen.queryByTestId('workout-data-display')
      ).not.toBeInTheDocument()
    })
  })
})
