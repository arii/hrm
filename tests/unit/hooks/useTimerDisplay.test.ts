/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useTimerDisplay.test.ts
import { renderHook } from '@testing-library/react'
import useTimerDisplay from '@/hooks/useTimerDisplay'
import { TimerData } from '@/types/websocket'

describe('useTimerDisplay', () => {
  it('should return "GET READY" state for PREPARE phase', () => {
    const timerData: TimerData = {
      currentPhase: 'PREPARE',
      timeRemaining: 5,
      timeElapsed: 0,
      mode: 'TABATA',
    }
    const { result } = renderHook(() => useTimerDisplay(timerData))
    expect(result.current.displayTime).toBe('05')
    expect(result.current.phaseColor).toBe('#F59E0B')
    expect(result.current.phaseLabel).toBe('GET READY')
  })

  it('should return "RUNNING" state for STOPWATCH mode', () => {
    const timerData: TimerData = {
      currentPhase: 'RUNNING',
      timeRemaining: 0,
      timeElapsed: 95,
      mode: 'STOPWATCH',
    }
    const { result } = renderHook(() => useTimerDisplay(timerData))
    expect(result.current.displayTime).toBe('01:35')
    expect(result.current.phaseColor).toBe('#2563EB')
    expect(result.current.phaseLabel).toBe('RUNNING')
  })

  it('should return "WORK" state for TABATA WORK phase', () => {
    const timerData: TimerData = {
      currentPhase: 'WORK',
      timeRemaining: 15,
      timeElapsed: 5,
      mode: 'TABATA',
    }
    const { result } = renderHook(() => useTimerDisplay(.timerData))
    expect(result.current.displayTime).toBe('00:15')
    expect(result.current.phaseColor).toBe('#EF4444')
    expect(result.current.phaseLabel).toBe('WORK')
  })

  it('should return "REST" state for TABATA REST phase', () => {
    const timerData: TimerData = {
      currentPhase: 'REST',
      timeRemaining: 8,
      timeElapsed: 2,
      mode: 'TABATA',
    }
    const { result } = renderHook(() => useTimerDisplay(timerData))
    expect(result.current.displayTime).toBe('00:08')
    expect(result.current.phaseColor).toBe('#22C55E')
    expect(result.current.phaseLabel).toBe('REST')
  })

  it('should return "COOLDOWN" state for TABATA COOLDOWN phase', () => {
    const timerData: TimerData = {
      currentPhase: 'COOLDOWN',
      timeRemaining: 25,
      timeElapsed: 5,
      mode: 'TABATA',
    }
    const { result } = renderHook(() => useTimerDisplay(timerData))
    expect(result.current.displayTime).toBe('00:25')
    expect(result.current.phaseColor).toBe('#3B82F6')
    expect(result.current.phaseLabel).toBe('COOLDOWN')
  })

  it('should return "READY" state for IDLE phase', () => {
    const timerData: TimerData = {
      currentPhase: 'IDLE',
      timeRemaining: 0,
      timeElapsed: 0,
      mode: 'TABATA',
    }
    const { result } = renderHook(() => useTimerDisplay(timerData))
    expect(result.current.displayTime).toBe('00:00')
    expect(result.current.phaseColor).toBe('#6B7280')
    expect(result.current.phaseLabel).toBe('READY')
  })
})
