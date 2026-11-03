/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import TimerModeSelector from '@/app/client/control/components/TimerModeSelector'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: jest.fn(({ children }) => children),
  },
}))

describe('TimerModeSelector (#9611)', () => {
  it('renders both mode buttons with the active mode indicated', () => {
    render(
      <TimerModeSelector mode="TABATA" disabled={false} onSelect={jest.fn()} />
    )
    expect(screen.getByTestId('tabata-mode-button')).toBeInTheDocument()
    expect(screen.getByTestId('stopwatch-mode-button')).toBeInTheDocument()
    expect(screen.getByTestId('timer-mode-heading')).toHaveTextContent(
      'Timer Mode'
    )
  })

  it('calls onSelect with the clicked mode', () => {
    const onSelect = jest.fn()
    render(
      <TimerModeSelector mode="TABATA" disabled={false} onSelect={onSelect} />
    )
    fireEvent.click(screen.getByTestId('stopwatch-mode-button'))
    expect(onSelect).toHaveBeenCalledWith('STOPWATCH')
  })

  it('disables both buttons when disabled', () => {
    render(
      <TimerModeSelector
        mode="STOPWATCH"
        disabled={true}
        onSelect={jest.fn()}
      />
    )
    expect(screen.getByTestId('tabata-mode-button')).toBeDisabled()
    expect(screen.getByTestId('stopwatch-mode-button')).toBeDisabled()
  })
})
