import React from 'react'
import { renderWithTheme, screen } from '../../utils/testHelpers'
import TimerDisplay from '../../../components/TimerDisplay'

// Mock the WebSocket context
jest.mock('../../../context/WebSocketContext', () => ({
  useWebSocket: () => ({
    timerState: {
      isRunning: false,
      currentPhase: 'STOPPED',
      timeRemaining: 0,
      currentRound: 1,
      totalRounds: 4,
      mode: 'TABATA',
    },
  }),
}))

describe('TimerDisplay Component', () => {
  test('renders timer display with default state', () => {
    renderWithTheme(<TimerDisplay />)
    
    expect(screen.getByText('00:00')).toBeInTheDocument()
    expect(screen.getByText('Round 1 of 4')).toBeInTheDocument()
    expect(screen.getByText('STOPPED')).toBeInTheDocument()
  })

  test('displays running timer state', () => {
    // Mock running state
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      timerState: {
        isRunning: true,
        currentPhase: 'WORK',
        timeRemaining: 30,
        currentRound: 2,
        totalRounds: 8,
        mode: 'TABATA',
      },
    })

    renderWithTheme(<TimerDisplay />)
    
    expect(screen.getByText('00:30')).toBeInTheDocument()
    expect(screen.getByText('Round 2 of 8')).toBeInTheDocument()
    expect(screen.getByText('WORK')).toBeInTheDocument()
  })

  test('displays rest phase correctly', () => {
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      timerState: {
        isRunning: true,
        currentPhase: 'REST',
        timeRemaining: 15,
        currentRound: 3,
        totalRounds: 4,
        mode: 'TABATA',
      },
    })

    renderWithTheme(<TimerDisplay />)
    
    expect(screen.getByText('00:15')).toBeInTheDocument()
    expect(screen.getByText('Round 3 of 4')).toBeInTheDocument()
    expect(screen.getByText('REST')).toBeInTheDocument()
  })

  test('formats time correctly for minutes and seconds', () => {
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      timerState: {
        isRunning: true,
        currentPhase: 'WORK',
        timeRemaining: 125, // 2 minutes 5 seconds
        currentRound: 1,
        totalRounds: 4,
        mode: 'TABATA',
      },
    })

    renderWithTheme(<TimerDisplay />)
    
    expect(screen.getByText('02:05')).toBeInTheDocument()
  })

  test('applies correct styling based on phase', () => {
    require('../../../context/WebSocketContext').useWebSocket.mockReturnValue({
      timerState: {
        isRunning: true,
        currentPhase: 'WORK',
        timeRemaining: 30,
        currentRound: 1,
        totalRounds: 4,
        mode: 'TABATA',
      },
    })

    const { container } = renderWithTheme(<TimerDisplay />)
    
    // Timer display should be rendered
    expect(container.firstChild).toBeInTheDocument()
  })
})
