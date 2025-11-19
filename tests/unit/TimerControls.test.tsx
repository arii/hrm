/** @jest-environment jsdom */

import TimerControls from '@/app/client/control/components/TimerControls'
import useWebSocket from '@/hooks/useWebSocket'
import type { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

type UseWebSocketReturn = ReturnType<typeof useWebSocket>

jest.mock('@/hooks/useWebSocket')

const mockedUseWebSocket = useWebSocket as jest.MockedFunction<
  () => UseWebSocketReturn
>

const baseTimerData: TimerData = {
  isRunning: false,
  currentPhase: 'IDLE',
  timeRemaining: 20,
  timeElapsed: 0,
  cycle: 0,
  totalCycles: 8,
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

    mockedUseWebSocket.mockReturnValue({
      hrmData: [],
      timerData: { ...baseTimerData },
      spotifyData: { trackName: '', artist: '', isPlaying: false },
      spotifyServiceInitialized: true,
      connectionStatus: 'Connected',
      sendData,
    } as unknown as UseWebSocketReturn)

    render(<TimerControls />)

    const user = userEvent.setup()

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
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600))
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
