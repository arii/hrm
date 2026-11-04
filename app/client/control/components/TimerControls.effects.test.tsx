import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import TimerControls from '@/app/client/control/components/TimerControls'
import {
  useTimerData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'

jest.mock('@/context/WebSocketContext', () => ({
  ...jest.requireActual('@/context/WebSocketContext'),
  useTimerData: jest.fn(),
  useWebSocketConnection: jest.fn(),
}))

const mockUseTimerData = useTimerData as jest.Mock
const mockUseConnection = useWebSocketConnection as jest.Mock

describe('TimerControls Effects', () => {
  it('should revert optimistic state when server state changes', async () => {
    const mockSendData = jest.fn()
    const initialTimerData = {
      isRunning: false,
      currentPhase: 'WORK',
      mode: 'TABATA',
    }

    mockUseTimerData.mockReturnValue(initialTimerData)
    mockUseConnection.mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })

    const { rerender } = render(<TimerControls />)

    // User clicks START, UI optimistically updates to 'Running'
    fireEvent.click(screen.getByTestId('start-timer-button'))
    expect(screen.getByTestId('timer-running')).toBeInTheDocument()

    // Server sends a delayed response indicating the timer is NOT running
    act(() => {
      mockUseTimerData.mockReturnValue({
        ...initialTimerData,
        isRunning: false,
      })
    })

    rerender(<TimerControls />)

    // The UI should revert to the server's state
    await waitFor(() => {
      expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    })
  })
})
