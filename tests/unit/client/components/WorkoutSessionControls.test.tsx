/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import WorkoutSessionControls from '@/app/client/control/components/WorkoutSessionControls'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import '@testing-library/jest-dom'

// Mock theme to wrap the component
const theme = createTheme()

describe('WorkoutSessionControls', () => {
  const mockOnStartSession = jest.fn()
  const mockOnPauseSession = jest.fn()
  const mockOnResumeSession = jest.fn()
  const mockOnEndSession = jest.fn()

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  // Use a helper to avoid repetition
  const renderComponent = (props: Partial<React.ComponentProps<typeof WorkoutSessionControls>>) => {
    const defaultProps: React.ComponentProps<typeof WorkoutSessionControls> = {
      isSessionActive: false,
      isPaused: false,
      onStartSession: mockOnStartSession,
      onPauseSession: mockOnPauseSession,
      onResumeSession: mockOnResumeSession,
      onEndSession: mockOnEndSession,
      connectionStatus: 'Connected',
    }
    return render(
      <ThemeProvider theme={theme}>
        <WorkoutSessionControls {...defaultProps} {...props} />
      </ThemeProvider>
    )
  }

  test('renders Start button when session is not active', () => {
    renderComponent({ isSessionActive: false })
    // Use a more specific query
    const startButton = screen.getByTestId('start-session-button')
    expect(startButton).toBeInTheDocument()
    expect(startButton).toBeEnabled()
    expect(startButton).toHaveTextContent(/start/i)
  })

  test('renders Pause and End buttons when session is active', () => {
    renderComponent({ isSessionActive: true })
    const pauseButton = screen.getByTestId('pause-resume-button')
    const endButton = screen.getByTestId('end-session-button')

    expect(pauseButton).toBeInTheDocument()
    expect(pauseButton).toBeEnabled()
    expect(pauseButton).toHaveTextContent(/pause/i)

    expect(endButton).toBeInTheDocument()
    expect(endButton).toBeEnabled()

    expect(screen.queryByTestId('start-session-button')).not.toBeInTheDocument()
  })

  test('renders Resume and End buttons when session is paused', () => {
    renderComponent({ isSessionActive: true, isPaused: true })
    const resumeButton = screen.getByTestId('pause-resume-button')
    const endButton = screen.getByTestId('end-session-button')

    expect(resumeButton).toBeInTheDocument()
    expect(resumeButton).toBeEnabled()
    expect(resumeButton).toHaveTextContent(/resume/i)

    expect(endButton).toBeInTheDocument()
    expect(endButton).toBeEnabled()
  })

  test('calls onStartSession when Start button is clicked', () => {
    renderComponent({ isSessionActive: false })
    fireEvent.click(screen.getByTestId('start-session-button'))
    expect(mockOnStartSession).toHaveBeenCalledTimes(1)
  })

  test('calls onPauseSession when Pause button is clicked', () => {
    renderComponent({ isSessionActive: true })
    fireEvent.click(screen.getByTestId('pause-resume-button'))
    expect(mockOnPauseSession).toHaveBeenCalledTimes(1)
  })

  test('calls onResumeSession when Resume button is clicked', () => {
    renderComponent({ isSessionActive: true, isPaused: true })
    fireEvent.click(screen.getByTestId('pause-resume-button'))
    expect(mockOnResumeSession).toHaveBeenCalledTimes(1)
  })

  test('calls onEndSession when End button is clicked', () => {
    renderComponent({ isSessionActive: true })
    fireEvent.click(screen.getByTestId('end-session-button'))
    expect(mockOnEndSession).toHaveBeenCalledTimes(1)
  })

  test('disables all buttons when disconnected', () => {
    // Test "Start" button disabled state
    const { rerender } = renderComponent({ connectionStatus: 'Disconnected' })
    expect(screen.getByTestId('start-session-button')).toBeDisabled()

    // Test "Pause" and "End" buttons disabled state
    rerender(
      <ThemeProvider theme={theme}>
        <WorkoutSessionControls
          isSessionActive={true}
          isPaused={false}
          onStartSession={mockOnStartSession}
          onPauseSession={mockOnPauseSession}
          onResumeSession={mockOnResumeSession}
          onEndSession={mockOnEndSession}
          connectionStatus="Disconnected"
        />
      </ThemeProvider>
    )
    expect(screen.getByTestId('pause-resume-button')).toBeDisabled()
    expect(screen.getByTestId('end-session-button')).toBeDisabled()
  })
})
