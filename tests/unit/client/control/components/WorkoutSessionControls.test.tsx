// File: tests/unit/client/control/components/WorkoutSessionControls.test.tsx
/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorkoutSessionControls from '@/app/client/control/components/WorkoutSessionControls'

describe('WorkoutSessionControls', () => {
  const onStartSession = jest.fn()
  const onPauseSession = jest.fn()
  const onResumeSession = jest.fn()
  const onEndSession = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Test case for initial state (session not active)
  test('renders START button when session is not active', () => {
    render(
      <WorkoutSessionControls
        isSessionActive={false}
        isPaused={false}
        onStartSession={onStartSession}
        onPauseSession={onPauseSession}
        onResumeSession={onResumeSession}
        onEndSession={onEndSession}
        isConnected={true}
      />
    )
    expect(screen.getByTestId('start-session-button')).toBeInTheDocument()
    expect(screen.queryByTestId('pause-session-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('resume-session-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('end-session-button')).not.toBeInTheDocument()
  })

  // Test case for active session state
  test('renders PAUSE and END buttons when session is active and not paused', () => {
    render(
      <WorkoutSessionControls
        isSessionActive={true}
        isPaused={false}
        onStartSession={onStartSession}
        onPauseSession={onPauseSession}
        onResumeSession={onResumeSession}
        onEndSession={onEndSession}
        isConnected={true}
      />
    )
    expect(screen.getByTestId('pause-session-button')).toBeInTheDocument()
    expect(screen.getByTestId('end-session-button')).toBeInTheDocument()
    expect(screen.queryByTestId('start-session-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('resume-session-button')).not.toBeInTheDocument()
  })

  // Test case for paused session state
  test('renders RESUME and END buttons when session is active and paused', () => {
    render(
      <WorkoutSessionControls
        isSessionActive={true}
        isPaused={true}
        onStartSession={onStartSession}
        onPauseSession={onPauseSession}
        onResumeSession={onResumeSession}
        onEndSession={onEndSession}
        isConnected={true}
      />
    )
    expect(screen.getByTestId('resume-session-button')).toBeInTheDocument()
    expect(screen.getByTestId('end-session-button')).toBeInTheDocument()
    expect(screen.queryByTestId('start-session-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pause-session-button')).not.toBeInTheDocument()
  })

  // Test cases for button clicks
  test('calls onStartSession when START button is clicked', () => {
    render(
      <WorkoutSessionControls
        isSessionActive={false}
        isPaused={false}
        onStartSession={onStartSession}
        onPauseSession={onPauseSession}
        onResumeSession={onResumeSession}
        onEndSession={onEndSession}
        isConnected={true}
      />
    )
    fireEvent.click(screen.getByTestId('start-session-button'))
    expect(onStartSession).toHaveBeenCalledTimes(1)
  })

  test('calls onPauseSession when PAUSE button is clicked', () => {
    render(
      <WorkoutSessionControls
        isSessionActive={true}
        isPaused={false}
        onStartSession={onStartSession}
        onPauseSession={onPauseSession}
        onResumeSession={onResumeSession}
        onEndSession={onEndSession}
        isConnected={true}
      />
    )
    fireEvent.click(screen.getByTestId('pause-session-button'))
    expect(onPauseSession).toHaveBeenCalledTimes(1)
  })

  test('calls onResumeSession when RESUME button is clicked', () => {
    render(
      <WorkoutSessionControls
        isSessionActive={true}
        isPaused={true}
        onStartSession={onStartSession}
        onPauseSession={onPauseSession}
        onResumeSession={onResumeSession}
        onEndSession={onEndSession}
        isConnected={true}
      />
    )
    fireEvent.click(screen.getByTestId('resume-session-button'))
    expect(onResumeSession).toHaveBeenCalledTimes(1)
  })

  test('calls onEndSession when END button is clicked', () => {
    render(
      <WorkoutSessionControls
        isSessionActive={true}
        isPaused={false}
        onStartSession={onStartSession}
        onPauseSession={onPauseSession}
        onResumeSession={onResumeSession}
        onEndSession={onEndSession}
        isConnected={true}
      />
    )
    fireEvent.click(screen.getByTestId('end-session-button'))
    expect(onEndSession).toHaveBeenCalledTimes(1)
  })

  // Test case for disabled state
  test('buttons are disabled when not connected', () => {
    render(
      <WorkoutSessionControls
        isSessionActive={false}
        isPaused={false}
        onStartSession={onStartSession}
        onPauseSession={onPauseSession}
        onResumeSession={onResumeSession}
        onEndSession={onEndSession}
        isConnected={false}
      />
    )
    expect(screen.getByTestId('start-session-button')).toBeDisabled()
  })
})
