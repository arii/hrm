/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import TimerControls from '@/app/client/control/components/TimerControls'
import {
  WebSocketContext,
  WebSocketContextType,
} from '@/context/WebSocketContext'
import {
  DISCONNECTED_UI_REVERT_DELAY,
  OPTIMISTIC_ACTION_TIMEOUT,
} from '@/app/client/control/constants'
import { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: jest.fn(({ children }) => children),
  },
}))

const mockTimerData: TimerData = {
  isRunning: false,
  isPaused: false,
  mode: 'TABATA',
  currentPhase: 'IDLE',
  timeRemaining: 0,
  workDuration: 20,
  restDuration: 10,
  totalRounds: 8,
  currentRound: 0,
}

const mockWebSocketContext: WebSocketContextType = {
  timerData: mockTimerData,
  sendData: jest.fn(),
  connectionStatus: 'Connected',
  connect: jest.fn(),
  disconnect: jest.fn(),
  hrmData: [],
  spotifyData: {
    track: null,
    isPlaying: false,
    volumePercent: 0,
  },
  activeAlerts: [],
  spotifyServiceInitialized: false,
  userSettings: null,
}

describe('TimerControls', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('optimistically updates UI to "running" when start is clicked', async () => {
    const sendDataSpy = jest.spyOn(mockWebSocketContext, 'sendData')
    render(
      <WebSocketContext.Provider value={mockWebSocketContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    const startButton = screen.getByTestId('start-timer-button')
    act(() => {
      fireEvent.click(startButton)
    })

    // UI should immediately update to show the timer as running
    await screen.findByTestId('timer-running')
    expect(screen.queryByTestId('start-timer-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('stop-timer-button')).toBeInTheDocument()
    expect(sendDataSpy).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
  })

  it('optimistically updates UI to "stopped" when stop is clicked', async () => {
    const runningContext = {
      ...mockWebSocketContext,
      timerData: { ...mockTimerData, isRunning: true },
    }
    const sendDataSpy = jest.spyOn(runningContext, 'sendData')
    render(
      <WebSocketContext.Provider value={runningContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    const stopButton = screen.getByTestId('stop-timer-button')
    act(() => {
      fireEvent.click(stopButton)
    })

    // UI should immediately update to show the timer as stopped
    await screen.findByTestId('timer-stopped')
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()
    expect(screen.queryByTestId('stop-timer-button')).not.toBeInTheDocument()
    expect(sendDataSpy).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
    })
  })

  it('reverts optimistic UI and does not send command if websocket is not connected', async () => {
    const disconnectedContext = {
      ...mockWebSocketContext,
      connectionStatus: 'Disconnected',
    }
    const sendDataSpy = jest.spyOn(disconnectedContext, 'sendData')

    render(
      <WebSocketContext.Provider value={disconnectedContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    // Check initial state
    expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()

    const startButton = screen.getByTestId('start-timer-button')
    act(() => {
      fireEvent.click(startButton)
    })

    // The UI should revert back to the original state after a timeout
    act(() => {
      jest.advanceTimersByTime(DISCONNECTED_UI_REVERT_DELAY + 1)
    })

    await waitFor(() => {
      expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    })
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()
    expect(sendDataSpy).not.toHaveBeenCalled()
  })

  it('reverts optimistic START if server state does not sync after timeout', async () => {
    const sendDataSpy = jest.spyOn(mockWebSocketContext, 'sendData')
    render(
      <WebSocketContext.Provider value={mockWebSocketContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    const startButton = screen.getByTestId('start-timer-button')
    act(() => {
      fireEvent.click(startButton)
    })

    // UI optimistically shows "Running"
    await screen.findByTestId('timer-running')
    expect(sendDataSpy).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })

    // Advance timers past the safety timeout
    act(() => {
      jest.advanceTimersByTime(OPTIMISTIC_ACTION_TIMEOUT + 100)
    })

    // The UI should revert to the server's state, which is still "stopped"
    await waitFor(() => {
      expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    })
  })

  it('reverts optimistic STOP if server state does not sync after timeout', async () => {
    const runningContext = {
      ...mockWebSocketContext,
      timerData: { ...mockTimerData, isRunning: true },
    }
    const sendDataSpy = jest.spyOn(runningContext, 'sendData')
    render(
      <WebSocketContext.Provider value={runningContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    const stopButton = screen.getByTestId('stop-timer-button')
    act(() => {
      fireEvent.click(stopButton)
    })

    // UI optimistically shows "Stopped"
    await screen.findByTestId('timer-stopped')
    expect(sendDataSpy).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
    })

    // Advance timers past the safety timeout
    act(() => {
      jest.advanceTimersByTime(OPTIMISTIC_ACTION_TIMEOUT + 100)
    })

    // The UI should revert to the server's state, which is still "running"
    await waitFor(() => {
      expect(screen.getByTestId('timer-running')).toBeInTheDocument()
    })
  })

  it('clears optimistic state when server state syncs', async () => {
    const { rerender } = render(
      <WebSocketContext.Provider value={mockWebSocketContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    const startButton = screen.getByTestId('start-timer-button')
    act(() => {
      fireEvent.click(startButton)
    })

    // UI optimistically shows "Running"
    await screen.findByTestId('timer-running')

    // Now, simulate the server state updating
    const updatedContext = {
      ...mockWebSocketContext,
      timerData: { ...mockTimerData, isRunning: true },
    }
    rerender(
      <WebSocketContext.Provider value={updatedContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    // The UI should remain "Running", now based on server state
    expect(screen.getByTestId('timer-running')).toBeInTheDocument()

    // IMPORTANT: Let's see if the timeout would incorrectly revert the UI
    // It shouldn't, because the optimistic state should have been cleared.
    act(() => {
      jest.advanceTimersByTime(3100)
    })

    // The UI should NOT have reverted and should still be running
    await waitFor(() => {
      expect(screen.getByTestId('timer-running')).toBeInTheDocument()
    })
  })
})
