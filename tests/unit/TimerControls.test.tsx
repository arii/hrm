/** @jest-environment jsdom */

import TimerControls from '@/app/client/control/components/TimerControls'
import { useWebSocket } from '@/context/WebSocketContext'
import type { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

type UseWebSocketReturn = ReturnType<typeof useWebSocket>

jest.mock('@/context/WebSocketContext')
jest.useFakeTimers()

const mockedUseWebSocket = useWebSocket as jest.MockedFunction<
  () => UseWebSocketReturn
>

const baseTimerData: TimerData = {
  isRunning: false,
  currentPhase: 'IDLE',
  timeRemaining: 20,
  timeElapsed: 0,
  mode: 'TABATA',
  soundEventId: 0,
  cycle: 0,
  totalCycles: 8,
}

describe('TimerControls', () => {
  beforeEach(() => {
    jest.resetAllMocks()

    // Mock the fetch call for Spotify devices to prevent console warnings
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'test-device-id', name: 'Test Device', is_active: true },
          ]),
      })
    ) as jest.Mock
  })

  it('should send a START_TABATA command with the correct config', async () => {
    const sendData = jest.fn()

    mockedUseWebSocket.mockReturnValue({
      hrmData: [],
      timerData: { ...baseTimerData },
      spotifyData: { trackName: '', artist: '', isPlaying: false, devices: [] },
      spotifyServiceInitialized: true,
      connectionStatus: 'Connected',
      sendData,
    } as unknown as UseWebSocketReturn)

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
    fireEvent.change(workInput, { target: { value: '45' } })
    fireEvent.change(restInput, { target: { value: '15' } })

    await user.click(screen.getByRole('button', { name: /start/i }))

    // Verify that START_TABATA was sent with the updated values in the config
    expect(sendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TIMER_COMMAND',
        command: 'START_TABATA',
        config: {
          workDuration: 45,
          restDuration: 15,
          totalCycles: 8,
        },
      })
    )
  })
})
