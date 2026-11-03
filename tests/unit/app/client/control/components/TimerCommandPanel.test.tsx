/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import TimerCommandPanel from '@/app/client/control/components/TimerCommandPanel'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: jest.fn(({ children }) => children),
  },
}))

describe('TimerCommandPanel (#9611)', () => {
  it('renders START when idle and fires onStart', () => {
    const onStart = jest.fn()
    render(
      <TimerCommandPanel
        isRunning={false}
        disabled={false}
        onStart={onStart}
        onStop={jest.fn()}
      />
    )
    const start = screen.getByTestId('start-timer-button')
    expect(start).toBeInTheDocument()
    expect(screen.queryByTestId('stop-timer-button')).not.toBeInTheDocument()
    fireEvent.click(start)
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('renders STOP when running and fires onStop', () => {
    const onStop = jest.fn()
    render(
      <TimerCommandPanel
        isRunning={true}
        disabled={false}
        onStart={jest.fn()}
        onStop={onStop}
      />
    )
    const stop = screen.getByTestId('stop-timer-button')
    expect(stop).toBeInTheDocument()
    expect(screen.queryByTestId('start-timer-button')).not.toBeInTheDocument()
    fireEvent.click(stop)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('disables the visible button when disabled', () => {
    render(
      <TimerCommandPanel
        isRunning={false}
        disabled={true}
        onStart={jest.fn()}
        onStop={jest.fn()}
      />
    )
    expect(screen.getByTestId('start-timer-button')).toBeDisabled()
  })
})
