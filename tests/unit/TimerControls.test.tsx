/** @jest-environment jsdom */

import TimerControls from '@/app/client/control/components/TimerControls'
<<<<<<< HEAD
import {
  useTimer,
  useWebSocketActions,
} from '@/hooks/useWebSocketContext'
=======
import { useWebSocket } from '@/context/WebSocketContext'
>>>>>>> origin/leader
import type { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

<<<<<<< HEAD
jest.mock('@/hooks/useWebSocketContext')
=======
type UseWebSocketReturn = ReturnType<typeof useWebSocket>

jest.mock('@/context/WebSocketContext')
>>>>>>> origin/leader
jest.useFakeTimers()

const mockedUseTimer = useTimer as jest.Mock
const mockedUseWebSocketActions = useWebSocketActions as jest.Mock

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
  })

  it('should send a TIMER_CONFIG message when durations change before starting the timer', async () => {
    const sendData = jest.fn()
    mockedUseTimer.mockReturnValue({ ...baseTimerData })
    mockedUseWebSocketActions.mockReturnValue({
      sendData,
      connectionStatus: 'Connected',
    })

    render(<TimerControls />)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    // Get the actual input elements using data-testid (following MUI testing pattern)
    const workInput = screen.getByTestId(
      'work-duration-input'
    ) as HTMLInputElement
    const restInput = screen.getByTestId(
      'rest-duration-input'
    ) as HTMLInputElement

    // Use fireEvent.change to directly trigger the onChange event with new values
    // This properly simulates input changes on MUI TextField components
    fireEvent.change(workInput, { target: { value: '45' } })
    fireEvent.change(restInput, { target: { value: '15' } })

    // Wait for debounce and React state updates (wrapped in act to avoid warnings)
    act(() => {
      jest.advanceTimersByTime(600)
    })

    await user.click(screen.getByRole('button', { name: /start/i }))

    // Verify that TIMER_CONFIG was sent with the updated values
    expect(sendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TIMER_CONFIG',
        workDuration: 45,
        restDuration: 15,
      })
    )
  })
})
