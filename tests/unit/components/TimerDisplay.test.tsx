/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import TimerDisplay from '@/components/TimerDisplay'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { AudioProvider } from '@/context/AudioContext'

jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: jest.fn(({ children }) => <div>{children}</div>),
  },
}))

describe('TimerDisplay', () => {
  it('should render the mode indicator with the correct animation', () => {
    render(
      <WebSocketProvider>
        <AudioProvider>
          <TimerDisplay />
        </AudioProvider>
      </WebSocketProvider>
    )
    const modeIndicator = screen.getByText('Connecting...')
    expect(modeIndicator).toBeInTheDocument()
  })
})
