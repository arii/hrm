/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import TimerControls from '@/app/client/control/components/TimerControls'
import { useWebSocket } from '@/context/WebSocketContext'
import type { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AudioProvider } from '@/context/AudioContext'

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
  workDuration: 20,
  restDuration: 10,
  soundEventId: 0,
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

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<AudioProvider>{component}</AudioProvider>)
  }

  it('should send a TIMER_CONFIG message when durations change before starting the timer', async () => {
    const sendData = jest.fn()

    const mockUseWebSocket: UseWebSocketReturn = {
      hrmData: [],
      timerData: { ...baseTimerData },
      spotifyData: {
        trackName: '',
        artist: '',
        isPlaying: false,
        albumArtUrl: '',
        albumName: '',
        devices: [],
        isMuted: false,
        volume: 0,
      },
      spotifyServiceInitialized: true,
      connectionStatus: 'Connected',
      sendData,
      isOwner: true,
    }
    mockedUseWebSocket.mockReturnValue(mockUseWebSocket)

    renderWithProviders(<TimerControls />)

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    // Find the stepper buttons by their accessible ARIA labels
    const increaseWorkButton = screen.getByRole('button', {
      name: /Increase Work Duration/i,
    })
    const increaseRestButton = screen.getByRole('button', {
      name: /Increase Rest Duration/i,
    })

    // Initial workTime is 20. Increase by 5, 5 times to reach 45.
    for (let i = 0; i < 5; i++) {
      await user.click(increaseWorkButton)
    }

    // Initial restTime is 10. Increase by 5 once to reach 15.
    await user.click(increaseRestButton)

    // Verify the UI displays the new values
    expect(
      screen.getByTestId('work duration (s)-duration-display')
    ).toHaveTextContent('45')
    expect(
      screen.getByTestId('rest duration (s)-duration-display')
    ).toHaveTextContent('15')

    // Wait for debounce and React state updates
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
