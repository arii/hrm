/** @jest-environment jsdom */

import TimerControls from '@/app/client/control/components/TimerControls'
import { useWebSocket } from '@/context/WebSocketContext'
import type { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the context directly
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

jest.useFakeTimers()

const mockedUseWebSocket = useWebSocket as jest.Mock

const baseTimerData: TimerData = {
  isRunning: false,
  currentPhase: 'IDLE',
  timeRemaining: 20,
  timeElapsed: 0,
  mode: 'TABATA',
  workDuration: 20,
  restDuration: 10,
  soundEventId: 0,
}

describe('TimerControls', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // Provide a default mock implementation for each test
    mockedUseWebSocket.mockReturnValue({
      timerData: { ...baseTimerData },
      sendData: jest.fn(),
      connectionStatus: 'Connected',
    })
  })

  it('should send a TIMER_CONFIG message when durations change before starting the timer', async () => {
    const sendData = jest.fn()
    mockedUseWebSocket.mockReturnValue({
      timerData: { ...baseTimerData },
      sendData,
      connectionStatus: 'Connected',
    })

    render(<TimerControls />)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    const workInput = screen.getByTestId('work-duration-input')
    const restInput = screen.getByTestId('rest-duration-input')

    fireEvent.change(workInput, { target: { value: '45' } })
    fireEvent.change(restInput, { target: { value: '15' } })

    act(() => {
      jest.advanceTimersByTime(600) // Wait for debounce
    })

    await user.click(screen.getByRole('button', { name: /start/i }))

    expect(sendData).toHaveBeenCalledWith({
      type: 'TIMER_CONFIG',
      workDuration: 45,
      restDuration: 15,
    })
  })
})
