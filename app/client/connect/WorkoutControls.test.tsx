/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import WorkoutControls from './WorkoutControls'
import { WorkoutStatus } from '../../../types/workout'

describe('WorkoutControls', () => {
  const mockOnStart = jest.fn()
  const mockOnPause = jest.fn()
  const mockOnEnd = jest.fn()
  const mockOnResume = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders Start Workout button when idle and connected', () => {
    render(
      <WorkoutControls
        workoutStatus={'idle' as WorkoutStatus}
        isConnected={true}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onEnd={mockOnEnd}
        onResume={mockOnResume}
      />
    )
    const startButton = screen.getByRole('button', {
      name: /start workout session/i,
    })
    expect(startButton).toBeInTheDocument()
    fireEvent.click(startButton)
    expect(mockOnStart).toHaveBeenCalledTimes(1)
  })

  it('does not render Start Workout button when not connected', () => {
    render(
      <WorkoutControls
        workoutStatus={'idle' as WorkoutStatus}
        isConnected={false}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onEnd={mockOnEnd}
        onResume={mockOnResume}
      />
    )
    expect(
      screen.queryByRole('button', { name: /start workout session/i })
    ).not.toBeInTheDocument()
  })

  it('renders Pause and End buttons when running', () => {
    render(
      <WorkoutControls
        workoutStatus={'running' as WorkoutStatus}
        isConnected={true}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onEnd={mockOnEnd}
        onResume={mockOnResume}
      />
    )
    const pauseButton = screen.getByRole('button', {
      name: /pause workout session/i,
    })
    const endButton = screen.getByRole('button', {
      name: /end workout session/i,
    })
    expect(pauseButton).toBeInTheDocument()
    expect(endButton).toBeInTheDocument()
    fireEvent.click(pauseButton)
    expect(mockOnPause).toHaveBeenCalledTimes(1)
    fireEvent.click(endButton)
    expect(mockOnEnd).toHaveBeenCalledTimes(1)
  })

  it('renders Resume and End buttons when paused', () => {
    render(
      <WorkoutControls
        workoutStatus={'paused' as WorkoutStatus}
        isConnected={true}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onEnd={mockOnEnd}
        onResume={mockOnResume}
      />
    )
    const resumeButton = screen.getByRole('button', {
      name: /resume workout session/i,
    })
    const endButton = screen.getByRole('button', {
      name: /end workout session/i,
    })
    expect(resumeButton).toBeInTheDocument()
    expect(endButton).toBeInTheDocument()
    fireEvent.click(resumeButton)
    expect(mockOnResume).toHaveBeenCalledTimes(1)
    fireEvent.click(endButton)
    expect(mockOnEnd).toHaveBeenCalledTimes(1)
  })

  it('disables Resume button when paused and not connected', () => {
    render(
      <WorkoutControls
        workoutStatus={'paused' as WorkoutStatus}
        isConnected={false}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onEnd={mockOnEnd}
        onResume={mockOnResume}
      />
    )
    const resumeButton = screen.getByRole('button', {
      name: /resume workout session/i,
    })
    expect(resumeButton).toBeDisabled()
  })
})
