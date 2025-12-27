/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import WorkoutManager from '../../../../../app/client/connect/WorkoutManager'

describe('WorkoutManager', () => {
  const defaultProps = {
    workoutStatus: 'idle' as 'idle' | 'running' | 'paused',
    onStartWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
    isConnected: true,
    hasStarted: false,
    duration: '00:00:00',
    caloriesBurned: 0,
    userName: 'Test User',
    currentHR: 0,
    hrZoneProps: { percentage: 0, progressColor: 'grey' },
  }

  it('renders the start workout button when idle', () => {
    render(<WorkoutManager {...defaultProps} />)
    expect(
      screen.getByRole('button', { name: 'Start workout session' })
    ).toBeInTheDocument()
  })

  it('renders the end workout button when running', () => {
    render(<WorkoutManager {...defaultProps} workoutStatus="running" />)
    expect(
      screen.getByRole('button', { name: 'End workout session' })
    ).toBeInTheDocument()
  })

  it('renders the resume and end workout buttons when paused', () => {
    render(<WorkoutManager {...defaultProps} workoutStatus="paused" />)
    expect(
      screen.getByRole('button', { name: 'Resume workout session' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'End workout session' })
    ).toBeInTheDocument()
  })
})
