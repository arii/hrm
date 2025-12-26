/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react'
import { useTimerVisuals } from '@/hooks/useTimerVisuals'
import { TimerData } from '@/types/websocket'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import theme from '@/lib/theme'

describe('useTimerVisuals', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider theme={createTheme(theme)}>{children}</ThemeProvider>
  )

  it('should return the correct visuals for the IDLE state', () => {
    const timerData: TimerData = {
      mode: 'TABATA',
      phase: 'IDLE',
      timeRemaining: 0,
      workDuration: 20,
      restDuration: 10,
      isRunning: false,
    }
    const { result } = renderHook(() => useTimerVisuals(timerData), {
      wrapper,
    })
    expect(result.current.displayTime).toBe('00:00')
    expect(result.current.phaseLabel).toBe('READY')
    expect(result.current.phaseColor).toBe(theme.palette.timer.idle)
  })

  it('should return the correct visuals for the PREPARE state', () => {
    const timerData: TimerData = {
      mode: 'TABATA',
      phase: 'PREPARE',
      timeRemaining: 3,
      workDuration: 20,
      restDuration: 10,
      isRunning: true,
    }
    const { result } = renderHook(() => useTimerVisuals(timerData), {
      wrapper,
    })
    expect(result.current.displayTime).toBe('03')
    expect(result.current.phaseLabel).toBe('GET READY')
    expect(result.current.phaseColor).toBe(theme.palette.timer.prepare)
  })

  it('should return the correct visuals for the WORK state', () => {
    const timerData: TimerData = {
      mode: 'TABATA',
      phase: 'WORK',
      timeRemaining: 15,
      workDuration: 20,
      restDuration: 10,
      isRunning: true,
    }
    const { result } = renderHook(() => useTimerVisuals(timerData), {
      wrapper,
    })
    expect(result.current.displayTime).toBe('00:15')
    expect(result.current.phaseLabel).toBe('WORK')
    expect(result.current.phaseColor).toBe(theme.palette.timer.work)
  })

  it('should return the correct visuals for the REST state', () => {
    const timerData: TimerData = {
      mode: 'TABATA',
      phase: 'REST',
      timeRemaining: 5,
      workDuration: 20,
      restDuration: 10,
      isRunning: true,
    }
    const { result } = renderHook(() => useTimerVisuals(timerData), {
      wrapper,
    })
    expect(result.current.displayTime).toBe('00:05')
    expect(result.current.phaseLabel).toBe('REST')
    expect(result.current.phaseColor).toBe(theme.palette.timer.rest)
  })

  it('should return the correct visuals for the STOPWATCH mode', () => {
    const timerData: TimerData = {
      mode: 'STOPWATCH',
      phase: 'RUNNING',
      timeRemaining: 0,
      timeElapsed: 125,
      workDuration: 20,
      restDuration: 10,
      isRunning: true,
    }
    const { result } = renderHook(() => useTimerVisuals(timerData), {
      wrapper,
    })
    expect(result.current.displayTime).toBe('02:05')
    expect(result.current.phaseLabel).toBe('RUNNING')
    expect(result.current.phaseColor).toBe(theme.palette.timer.stopwatch)
  })
})
