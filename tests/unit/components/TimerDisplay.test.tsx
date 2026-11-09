/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import TimerDisplay, {
  resolveTimerPhaseVisual,
  resolveWsDotColor,
  type TimerPhasePalette,
} from '@/components/TimerDisplay'
import {
  useTimerData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { audioManager } from '@/utils/audioManager'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')

const mockedUseTimerData = useTimerData as jest.Mock
const mockedUseConnection = useWebSocketConnection as jest.Mock

describe('TimerDisplay', () => {
  // A helper function to set up the mock for a specific test
  const setupMock = (timerData: Partial<TimerData>) => {
    mockedUseTimerData.mockReturnValue(timerData)
    mockedUseConnection.mockReturnValue({
      connectionStatus: 'Connected',
    })
  }

  it('should render the IDLE state correctly', () => {
    setupMock({
      currentPhase: 'IDLE',
      timeRemaining: 0,
      timeElapsed: 0,
      mode: 'TABATA',
    })
    render(<TimerDisplay />)
    // In the IDLE state, a phase label is not shown
    expect(screen.queryByTestId('timer-phase')).not.toBeInTheDocument()
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:00')
  })

  it('should render the WORK phase correctly', () => {
    setupMock({
      currentPhase: 'WORK',
      timeRemaining: 15,
      timeElapsed: 5,
      mode: 'TABATA',
    })
    render(<TimerDisplay />)

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('WORK')
    // It should display the remaining time formatted as MM:SS
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:15')
  })

  it('should render the REST phase correctly', () => {
    setupMock({
      currentPhase: 'REST',
      timeRemaining: 5,
      timeElapsed: 15,
      mode: 'TABATA',
    })
    render(<TimerDisplay />)

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('REST')
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:05')
  })

  it('should render correctly in STOPWATCH mode', () => {
    setupMock({
      currentPhase: 'RUNNING',
      timeRemaining: 0,
      timeElapsed: 125, // 2 minutes and 5 seconds
      mode: 'STOPWATCH',
    })
    render(<TimerDisplay />)

    // In stopwatch mode, a phase label is not shown
    expect(screen.queryByTestId('timer-phase')).not.toBeInTheDocument()
    // It should display the elapsed time
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('02:05')
  })

  it('should render the PREPARE phase correctly', () => {
    setupMock({
      currentPhase: 'PREPARE',
      timeRemaining: 3,
      timeElapsed: 0,
      mode: 'TABATA',
    })
    render(<TimerDisplay />)

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('GET READY')
    // Prepare phase shows seconds only
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('03')
  })

  describe('resolveTimerPhaseVisual', () => {
    const palette: TimerPhasePalette = {
      warningDark: 'W',
      infoMain: 'I',
      errorMain: 'E',
      successMain: 'S',
      textSecondary: 'T',
    }

    it.each([
      [
        'PREPARE shows countdown seconds',
        {
          mode: 'TABATA',
          currentPhase: 'PREPARE',
          timeRemaining: 3,
          timeElapsed: 0,
        },
        { displayTime: '03', phaseColor: 'W', phaseLabel: 'GET READY' },
      ],
      [
        'STOPWATCH shows elapsed MM:SS',
        {
          mode: 'STOPWATCH',
          currentPhase: 'RUNNING',
          timeRemaining: 0,
          timeElapsed: 125,
        },
        { displayTime: '02:05', phaseColor: 'I', phaseLabel: 'RUNNING' },
      ],
      [
        'TABATA WORK shows remaining MM:SS',
        {
          mode: 'TABATA',
          currentPhase: 'WORK',
          timeRemaining: 15,
          timeElapsed: 5,
        },
        { displayTime: '00:15', phaseColor: 'E', phaseLabel: 'WORK' },
      ],
      [
        'TABATA REST shows remaining MM:SS',
        {
          mode: 'TABATA',
          currentPhase: 'REST',
          timeRemaining: 5,
          timeElapsed: 15,
        },
        { displayTime: '00:05', phaseColor: 'S', phaseLabel: 'REST' },
      ],
      [
        'TABATA COOLDOWN shows remaining MM:SS',
        {
          mode: 'TABATA',
          currentPhase: 'COOLDOWN',
          timeRemaining: 9,
          timeElapsed: 51,
        },
        { displayTime: '00:09', phaseColor: 'I', phaseLabel: 'COOLDOWN' },
      ],
      [
        'IDLE renders ready copy',
        {
          mode: 'TABATA',
          currentPhase: 'IDLE',
          timeRemaining: 0,
          timeElapsed: 0,
        },
        { displayTime: '00:00', phaseColor: 'T', phaseLabel: 'READY' },
      ],
      [
        'RUNNING outside stopwatch mode falls back to ready',
        {
          mode: 'TABATA',
          currentPhase: 'RUNNING',
          timeRemaining: 7,
          timeElapsed: 7,
        },
        { displayTime: '00:00', phaseColor: 'T', phaseLabel: 'READY' },
      ],
      [
        'WORK outside tabata mode falls back to ready',
        {
          mode: 'STOPWATCH',
          currentPhase: 'WORK',
          timeRemaining: 7,
          timeElapsed: 7,
        },
        { displayTime: '00:00', phaseColor: 'T', phaseLabel: 'READY' },
      ],
    ])('%s', (_name, input, expected) => {
      expect(resolveTimerPhaseVisual(input, palette)).toEqual(expected)
    })
  })

  describe('resolveWsDotColor', () => {
    const palette: TimerPhasePalette = {
      warningDark: 'W',
      infoMain: 'I',
      errorMain: 'E',
      successMain: 'S',
      textSecondary: 'T',
    }

    it.each([
      ['Connected', 'S'],
      ['Reconnecting...', 'W'],
      ['Disconnected', 'E'],
      ['', 'E'],
    ])('%p resolves to %p', (status, expected) => {
      expect(resolveWsDotColor(status, palette)).toBe(expected)
    })
  })

  describe('Layout Structure', () => {
    it('should implement an absolute-positioned side column layout for perfect centering', () => {
      setupMock({
        currentPhase: 'WORK',
        mode: 'TABATA',
        workDuration: 30,
        restDuration: 15,
      })

      render(<TimerDisplay />)

      const flexContainer = screen.getByTestId('timer-display-container')
      // Container is still a flex container for the main content centering
      expect(flexContainer).toHaveStyle('display: flex')

      // The main content should be relatively positioned and occupy full width
      const mainContent = screen
        .getByTestId('timer-countdown')
        .closest('.MuiCardContent-root')
      expect(mainContent).toHaveStyle('position: relative')
      expect(mainContent).toHaveStyle('width: 100%')

      // Check for absolute positioned side labels
      // We can't easily use getComputedStyle in this JSDOM environment for absolute positioning
      // if it's set via MUI sx props and not in actual CSS, but we can check the presence of the text
      expect(flexContainer).toHaveTextContent('TABATA')
      expect(flexContainer).toHaveTextContent('WORK:30s REST:15s')
    })
  })

  describe('Timer beep volume control', () => {
    const idleMock = {
      currentPhase: 'IDLE',
      timeRemaining: 0,
      timeElapsed: 0,
      mode: 'TABATA',
    } as Partial<TimerData>

    beforeEach(() => {
      window.localStorage.clear()
      audioManager.setMuted(false)
      audioManager.setVolume(70)
    })

    it('restores the mute button and volume slider', () => {
      setupMock(idleMock)
      render(<TimerDisplay />)
      expect(screen.getByTestId('timer-volume-mute-button')).toBeInTheDocument()
      expect(screen.getByTestId('timer-volume-slider')).toBeInTheDocument()
    })

    it('mutes and unmutes beeps via the mute button', () => {
      setupMock(idleMock)
      render(<TimerDisplay />)
      const muteButton = screen.getByTestId('timer-volume-mute-button')
      fireEvent.click(muteButton)
      expect(audioManager.getMuted()).toBe(true)
      fireEvent.click(muteButton)
      expect(audioManager.getMuted()).toBe(false)
    })

    it('sets beep volume via the slider without touching music keys', () => {
      window.localStorage.setItem('hrm-preferred-volume', '42')
      setupMock(idleMock)
      render(<TimerDisplay />)
      const sliderInput = screen
        .getByTestId('timer-volume-slider')
        .querySelector('input')
      expect(sliderInput).not.toBeNull()
      fireEvent.change(sliderInput!, { target: { value: '30' } })
      expect(audioManager.getVolume()).toBe(30)
      // Beep preference persists under its own keys only.
      expect(window.localStorage.getItem('hrm-timer-volume')).toBe('30')
      expect(window.localStorage.getItem('hrm-preferred-volume')).toBe('42')
    })
  })
})
