/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TimerControls from '@/app/client/control/components/TimerControls'
import { WebSocketContext } from '@/context/WebSocketContext'

describe('TimerControls', () => {
  it('reverts optimistic UI if server state does not sync after timeout', async () => {
    const sendDataSpy = jest.fn()
    const mockContext = {
      timerData: { isRunning: false, currentPhase: 'IDLE' },
      sendData: sendDataSpy,
      connectionStatus: 'Connected',
    }

    render(
      <WebSocketContext.Provider value={mockContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    // Initial state: Timer is stopped
    expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()

    // Click the "START" button
    fireEvent.click(screen.getByTestId('start-timer-button'))

    // Optimistic UI: Timer is running
    expect(screen.getByTestId('timer-running')).toBeInTheDocument()

    // Fast-forward timers
    jest.advanceTimersByTime(5001)

    // The UI should revert to the server's state, which is still "stopped"
    await waitFor(
      () => {
        expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
      },
      { timeout: 5100 }
    )
    expect(sendDataSpy).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
  })
})
