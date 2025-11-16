/** @jest-environment jsdom */

import TimerControls from '@/app/client/control/components/TimerControls'
import useWebSocket from '@/hooks/useWebSocket'
import type { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
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
    const workInput = screen.getByLabelText('Work duration in seconds')
    const restInput = screen.getByLabelText('Rest duration in seconds')

    await user.click(workInput)
    await user.keyboard('{Control>}a{/Control}')
    await user.type(workInput, '45')
    await user.click(restInput)
    await user.keyboard('{Control>}a{/Control}')
    await user.type(restInput, '15')

    await user.click(screen.getByRole('button', { name: /start/i }))

    expect(sendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TIMER_CONFIG',
        workDuration: 45,
        restDuration: 15,
      })
    )
  })
})
