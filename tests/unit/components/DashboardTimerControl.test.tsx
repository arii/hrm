/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ReactNode } from 'react'
import {
  DashboardTimerControlProvider,
  useDashboardTimerControl,
} from '@/components/DashboardTimerControl'
import IntervalStartButton from '@/components/IntervalStartButton'
import TimerDisplay from '@/components/TimerDisplay'
import {
  useTimerData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'

jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useSpotifyCommand')

const mockedUseTimerData = useTimerData as jest.Mock
const mockedUseConnection = useWebSocketConnection as jest.Mock
const mockedUseSpotifyCommand = useSpotifyCommand as jest.Mock

const sendData = jest.fn()
const executeSpotify = jest.fn()

const setup = ({
  isRunning = false,
  connectionStatus = 'Connected',
}: { isRunning?: boolean; connectionStatus?: string } = {}) => {
  mockedUseTimerData.mockReturnValue({
    isRunning,
    mode: 'TABATA',
    currentPhase: isRunning ? 'WORK' : 'IDLE',
    timeRemaining: 20,
    timeElapsed: 0,
    workDuration: 30,
    restDuration: 15,
  })
  mockedUseConnection.mockReturnValue({ sendData, connectionStatus })
  mockedUseSpotifyCommand.mockReturnValue({ execute: executeSpotify })
}

const withControl = (ui: ReactNode) =>
  render(<DashboardTimerControlProvider>{ui}</DashboardTimerControlProvider>)

describe('dashboard timer control', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    sendData.mockClear()
    executeSpotify.mockClear()
  })
  afterEach(() => jest.useRealTimers())

  it('starts the timer from the card with the current durations', () => {
    setup()
    withControl(<TimerDisplay />)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(sendData).toHaveBeenCalledWith({
      type: 'TIMER_CONFIG',
      workDuration: 30,
      restDuration: 15,
    })
    expect(sendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
  })

  it('hides Stop while running until the card is tapped, then hides it again', () => {
    setup({ isRunning: true })
    withControl(<TimerDisplay />)

    const stop = screen.getByRole('button', { name: 'Stop' })
    expect(stop).toHaveStyle({ opacity: '0', pointerEvents: 'none' })

    fireEvent.click(screen.getByTestId('timer-reveal-area'))
    expect(stop).toHaveStyle({ opacity: '1', pointerEvents: 'auto' })

    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(stop).toHaveStyle({ opacity: '0' })
  })

  it('sends STOP when the revealed Stop is tapped', () => {
    setup({ isRunning: true })
    withControl(<TimerDisplay />)

    fireEvent.click(screen.getByTestId('timer-reveal-area'))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(sendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
    })
  })

  it('disables Start while the control socket is down', () => {
    setup({ connectionStatus: 'Connecting' })
    withControl(<TimerDisplay />)

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
  })

  it('renders no Start/Stop outside the provider', () => {
    setup()
    render(<TimerDisplay />)

    expect(screen.queryByTestId('timer-toggle')).not.toBeInTheDocument()
  })

  it('starts the card interval as a Tabata in mode, config, start order', () => {
    setup()
    withControl(<IntervalStartButton header="25/10x3" />)

    fireEvent.click(screen.getByRole('button', { name: 'Start 25/10' }))

    expect(sendData.mock.calls.map(([message]) => message)).toEqual([
      { type: 'SET_MODE', mode: 'TABATA' },
      { type: 'TIMER_CONFIG', workDuration: 25, restDuration: 10 },
      { type: 'TIMER_COMMAND', command: 'START' },
    ])
    expect(executeSpotify).toHaveBeenCalledWith('NEXT')
  })

  it('disables the card interval button while a timer runs', () => {
    setup({ isRunning: true })
    withControl(<IntervalStartButton header="20/10" />)

    expect(screen.getByRole('button', { name: 'Start 20/10' })).toBeDisabled()
  })

  it('shows no interval button for non-interval headers', () => {
    setup()
    withControl(<IntervalStartButton header="3 x 10" />)

    expect(screen.queryByTestId('interval-start')).not.toBeInTheDocument()
  })

  it('exposes null control outside the provider', () => {
    const Probe = () => <span>{String(useDashboardTimerControl())}</span>
    render(<Probe />)
    expect(screen.getByText('null')).toBeInTheDocument()
  })
})
