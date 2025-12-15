/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import WorkoutSessionControls from '@/app/client/control/components/WorkoutSessionControls'
import '@testing-library/jest-dom'

describe('WorkoutSessionControls', () => {
  const mockOnStartSession = jest.fn()
  const mockOnPauseSession = jest.fn()
  const mockOnResumeSession = jest.fn()
  const mockOnEndSession = jest.fn()

  const defaultProps = {
    isSessionActive: false,
    isPaused: false,
    onStartSession: mockOnStartSession,
    onPauseSession: mockOnPauseSession,
    onResumeSession: mockOnResumeSession,
    onEndSession: mockOnEndSession,
    connectionStatus: 'Connected',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the Start button when no session is active', () => {
    render(<WorkoutSessionControls {...defaultProps} />)
    expect(screen.getByTestId('start-session-button')).toBeInTheDocument()
    expect(screen.getByText('Start')).toBeInTheDocument()
  })

  it('calls onStartSession when the Start button is clicked', () => {
    render(<WorkoutSessionControls {...defaultProps} />)
    fireEvent.click(screen.getByTestId('start-session-button'))
    expect(mockOnStartSession).toHaveBeenCalledTimes(1)
  })

  it('renders Pause and End buttons when a session is active and not paused', () => {
    render(<WorkoutSessionControls {...defaultProps} isSessionActive={true} />)
    expect(screen.getByTestId('pause-resume-button')).toBeInTheDocument()
    expect(screen.getByText('Pause')).toBeInTheDocument()
    expect(screen.getByTestId('end-session-button')).toBeInTheDocument()
    expect(screen.getByText('End')).toBeInTheDocument()
  })

  it('calls onPauseSession when the Pause button is clicked', () => {
    render(<WorkoutSessionControls {...defaultProps} isSessionActive={true} />)
    fireEvent.click(screen.getByTestId('pause-resume-button'))
    expect(mockOnPauseSession).toHaveBeenCalledTimes(1)
  })

  it('renders Resume and End buttons when a session is active and paused', () => {
    render(
      <WorkoutSessionControls
        {...defaultProps}
        isSessionActive={true}
        isPaused={true}
      />
    )
    expect(screen.getByTestId('pause-resume-button')).toBeInTheDocument()
    expect(screen.getByText('Resume')).toBeInTheDocument()
    expect(screen.getByTestId('end-session-button')).toBeInTheDocument()
    expect(screen.getByText('End')).toBeInTheDocument()
  })

  it('calls onResumeSession when the Resume button is clicked', () => {
    render(
      <WorkoutSessionControls
        {...defaultProps}
        isSessionActive={true}
        isPaused={true}
      />
    )
    fireEvent.click(screen.getByTestId('pause-resume-button'))
    expect(mockOnResumeSession).toHaveBeenCalledTimes(1)
  })

  it('calls onEndSession when the End button is clicked', () => {
    render(<WorkoutSessionControls {...defaultProps} isSessionActive={true} />)
    fireEvent.click(screen.getByTestId('end-session-button'))
    expect(mockOnEndSession).toHaveBeenCalledTimes(1)
  })

  it('disables all buttons when not connected', () => {
    render(
      <WorkoutSessionControls
        {...defaultProps}
        connectionStatus="Disconnected"
      />
    )
    expect(screen.getByTestId('start-session-button')).toBeDisabled()
  })

  it('disables pause and end buttons when not connected', () => {
    render(
      <WorkoutSessionControls
        {...defaultProps}
        isSessionActive={true}
        connectionStatus="Disconnected"
      />
    )
    expect(screen.getByTestId('pause-resume-button')).toBeDisabled()
    expect(screen.getByTestId('end-session-button')).toBeDisabled()
  })
})
