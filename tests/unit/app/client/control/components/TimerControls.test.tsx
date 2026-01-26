/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import TimerControls from '@/app/client/control/components/TimerControls'
import { WebSocketContext } from '@/context/WebSocketContext'
import { mockWebSocketContext } from '../../../../../__mocks__/WebSocketContext'
import { TimerData } from '@/types/timer'

// Mock the useDebounce hook as it's not relevant to these tests
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}))

describe('TimerControls', () => {
  let sendDataMock: jest.Mock

  beforeEach(() => {
    sendDataMock = jest.fn()
  })

  const renderComponent = (
    timerData: Partial<TimerData>,
    connectionStatus = 'Connected'
  ) => {
    const contextValue = {
      ...mockWebSocketContext,
      timerData: {
        ...mockWebSocketContext.timerData,
        ...timerData,
      },
      connectionStatus,
      sendData: sendDataMock,
    }
    return render(
      <WebSocketContext.Provider value={contextValue}>
        <TimerControls />
      </WebSocketContext.Provider>
    )
  }

  it('renders correctly in the stopped state', () => {
    renderComponent({ isRunning: false })
    expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()
    expect(
      screen.queryByTestId('stop-timer-button')
    ).not.toBeInTheDocument()
  })

  it('renders correctly in the running state', () => {
    renderComponent({ isRunning: true })
    expect(screen.getByTestId('timer-running')).toBeInTheDocument()
    expect(
      screen.queryByTestId('start-timer-button')
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('stop-timer-button')).toBeInTheDocument()
  })

  it('optimistically updates to "running" when start is clicked', () => {
    renderComponent({ isRunning: false })
    fireEvent.click(screen.getByTestId('start-timer-button'))
    expect(screen.getByTestId('timer-running')).toBeInTheDocument()
    expect(screen.getByTestId('stop-timer-button')).toBeInTheDocument()
    expect(sendDataMock).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
  })

  it('optimistically updates to "stopped" when stop is clicked', () => {
    renderComponent({ isRunning: true })
    fireEvent.click(screen.getByTestId('stop-timer-button'))
    expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()
    expect(sendDataMock).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
    })
  })

  it('synchronizes with server state when timer stops remotely', () => {
    const { rerender } = renderComponent({ isRunning: true })
    expect(screen.getByTestId('timer-running')).toBeInTheDocument()

    // Simulate a server-side update where the timer stops
    const updatedContextValue = {
      ...mockWebSocketContext,
      timerData: { ...mockWebSocketContext.timerData, isRunning: false },
      sendData: sendDataMock,
    }
    rerender(
      <WebSocketContext.Provider value={updatedContextValue}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()
  })

  it('reverts optimistic UI if disconnected', async () => {
    jest.useFakeTimers()
    renderComponent({ isRunning: false }, 'Disconnected')
    fireEvent.click(screen.getByTestId('start-timer-button'))
    expect(screen.getByTestId('timer-running')).toBeInTheDocument()
    // Fast-forward timers
    await act(async () => {
      jest.runAllTimers()
    })
    expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    jest.useRealTimers()
  })
})
