import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import TimerControls from '@/app/client/control/components/TimerControls'
import { useWebSocket } from '@/context/WebSocketContext'

jest.mock('@/context/WebSocketContext', () => ({
  ...jest.requireActual('@/context/WebSocketContext'),
  useWebSocket: jest.fn(),
}))

const mockUseWebSocket = useWebSocket as jest.Mock

describe('TimerControls Effects', () => {
  it('should revert optimistic state when server state changes', async () => {
    const mockSendData = jest.fn()
    const initialTimerData = {
      isRunning: false,
      currentPhase: 'WORK',
      mode: 'TABATA',
    }

    mockUseWebSocket.mockReturnValue({
      timerData: initialTimerData,
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })

    const { rerender } = render(<TimerControls />)

    // User clicks START, UI optimistically updates to 'Running'
    fireEvent.click(screen.getByTestId('start-timer-button'))
    expect(screen.getByTestId('timer-running')).toBeInTheDocument()

    // Server sends a delayed response indicating the timer is NOT running
    act(() => {
      mockUseWebSocket.mockReturnValue({
        timerData: { ...initialTimerData, isRunning: false },
        sendData: mockSendData,
        connectionStatus: 'Connected',
      })
    })

    rerender(<TimerControls />)

    // The UI should revert to the server's state
    await waitFor(() => {
      expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    })
  })
})
