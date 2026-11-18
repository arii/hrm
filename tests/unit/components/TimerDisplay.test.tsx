/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import TimerDisplay, {
  resolveTimerSummary,
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
    expect(screen.getByTestId('timer-phase')).toHaveTextContent('READY')
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:00')
    expect(
      screen.queryByRole('button', { name: /^(start|stop)$/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('timer-reveal-area')).not.toBeInTheDocument()
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
    fireEvent.click(screen.getByTestId('timer-countdown'))
    expect(
      screen.queryByRole('button', { name: /^(start|stop)$/i })
    ).not.toBeInTheDocument()
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

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('RUNNING')
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
    it.each(['WORK', 'REST'] as const)(
      '#9904 emphasizes the active %s interval without relying on color',
      (currentPhase) => {
        setupMock({
          mode: 'TABATA',
          currentPhase,
          workDuration: 30,
          restDuration: 10,
          timeRemaining: 27,
          timeElapsed: 3,
        })
        render(<TimerDisplay />)
        const work = screen.getByTestId('timer-work')
        const rest = screen.getByTestId('timer-rest')
        const active = currentPhase === 'WORK' ? work : rest
        const inactive = currentPhase === 'WORK' ? rest : work
        expect(active).toHaveStyle('font-weight: 900; opacity: 1')
        expect(inactive).toHaveStyle('font-weight: 700; opacity: 0.65')
        expect(getComputedStyle(active).color).not.toBe(
          getComputedStyle(inactive).color
        )
        expect(screen.getByTestId('timer-work-rest-badge')).toHaveTextContent(
          'WORK 30 · REST 10'
        )
        expect(
          screen.getByRole('group', {
            name: 'Work 30 seconds, rest 10 seconds',
          })
        ).toBe(screen.getByTestId('timer-work-rest-badge'))
        expect(screen.getByTestId('timer-phase')).toHaveAttribute(
          'aria-live',
          'polite'
        )
        expect(screen.getByTestId('timer-phase')).toHaveTextContent(
          currentPhase
        )
        expect(screen.getByTestId('timer-phase')).toHaveStyle(
          'position: absolute'
        )
      }
    )

    it.each([
      ['TABATA', 'PREPARE', 'GET READY', true],
      ['TABATA', 'COOLDOWN', 'COOLDOWN', true],
      ['TABATA', 'IDLE', 'READY', true],
      ['STOPWATCH', 'RUNNING', 'RUNNING', false],
      ['STOPWATCH', 'IDLE', 'READY', false],
      ['STOPWATCH', 'WORK', 'READY', false],
    ] as const)(
      '#9904 preserves visible phase information in %s / %s',
      (mode, currentPhase, label, hasIntervals) => {
        setupMock({ mode, currentPhase, timeRemaining: 3, timeElapsed: 125 })
        render(<TimerDisplay />)
        const phase = screen.getByTestId('timer-phase')
        expect(phase).toHaveTextContent(label)
        expect(phase).not.toHaveStyle('position: absolute')
        expect(phase).toHaveAttribute('aria-live', 'polite')
        expect(!!screen.queryByTestId('timer-work-rest-badge')).toBe(
          hasIntervals
        )
      }
    )

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
      expect(screen.getByTestId('timer-work-rest-badge')).toHaveTextContent(
        'WORK 30 · REST 15'
      )
    })
  })
})

describe('TimerDisplay beep volume', () => {
  beforeEach(() => {
    mockedUseTimerData.mockReturnValue({
      currentPhase: 'IDLE',
      timeRemaining: 0,
      timeElapsed: 0,
      mode: 'TABATA',
    })
    mockedUseConnection.mockReturnValue({ connectionStatus: 'Connected' })
    audioManager.setMuted(false)
    audioManager.setVolume(70)
  })

  it('mute button toggles the beeps and keeps the chosen level', () => {
    render(<TimerDisplay />)
    fireEvent.click(screen.getByRole('button', { name: 'Mute timer beeps' }))
    expect(audioManager.getPreference()).toEqual({ volume: 70, muted: true })
    expect(
      screen.getByRole('slider', { name: 'Timer beep volume' })
    ).toHaveValue('0')
    fireEvent.click(screen.getByRole('button', { name: 'Unmute timer beeps' }))
    expect(audioManager.getPreference()).toEqual({ volume: 70, muted: false })
  })

  it('slider sets the beep volume, and dragging to zero mutes', () => {
    render(<TimerDisplay />)
    const slider = screen.getByRole('slider', { name: 'Timer beep volume' })
    fireEvent.change(slider, { target: { value: 35 } })
    expect(audioManager.getPreference()).toEqual({ volume: 35, muted: false })
    fireEvent.change(slider, { target: { value: 0 } })
    expect(audioManager.getPreference()).toEqual({ volume: 35, muted: true })
  })
})

describe('resolveTimerSummary', () => {
  it('shows the Tabata intervals without naming the mode', () => {
    expect(
      resolveTimerSummary({
        mode: 'TABATA',
        workDuration: 20,
        restDuration: 10,
      })
    ).toBe('WORK 20 · REST 10')
  })

  it('is empty for a stopwatch', () => {
    expect(
      resolveTimerSummary({
        mode: 'STOPWATCH',
        workDuration: 20,
        restDuration: 10,
      })
    ).toBe('')
  })
})

describe('TimerDisplay connection status', () => {
  beforeEach(() => {
    mockedUseTimerData.mockReturnValue({
      currentPhase: 'IDLE',
      timeRemaining: 0,
      timeElapsed: 0,
      mode: 'TABATA',
    })
    audioManager.setMuted(false)
  })

  it('shows only the dot while connected, keeping the words for screen readers', () => {
    mockedUseConnection.mockReturnValue({ connectionStatus: 'Connected' })
    render(<TimerDisplay />)
    const status = screen.getByTestId('ws-status-indicator')
    expect(status).toHaveTextContent('Connected')
    expect(status).toHaveStyle({
      position: 'absolute',
      width: '1px',
      overflow: 'hidden',
    })
  })

  it('shows the words once the connection drops', () => {
    mockedUseConnection.mockReturnValue({ connectionStatus: 'Disconnected' })
    render(<TimerDisplay />)
    const status = screen.getByTestId('ws-status-indicator')
    expect(status).toHaveTextContent('Disconnected')
    expect(status).not.toHaveStyle({ position: 'absolute' })
  })

  it('uses a bell for the beeps control instead of a speaker', () => {
    mockedUseConnection.mockReturnValue({ connectionStatus: 'Connected' })
    render(<TimerDisplay />)
    const mute = screen.getByRole('button', { name: 'Mute timer beeps' })
    expect(
      mute.querySelector('[data-testid="NotificationsActiveIcon"]')
    ).not.toBeNull()
    expect(screen.queryByText('Beeps')).not.toBeInTheDocument()
  })
})
