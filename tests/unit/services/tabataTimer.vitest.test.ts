// File: tests/unit/services/tabataTimer.vitest.test.ts
/**
 * @file Unit tests for the refactored TabataTimer service using Vitest.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TabataTimer from '../../../services/tabataTimer';
import { ConfigurationError } from '../../../types/errors';

// Mock the broadcast function
const broadcastUpdate = vi.fn();

describe('TabataTimer (Vitest)', () => {
  let timer: TabataTimer;

  beforeEach(() => {
    vi.useFakeTimers();
    broadcastUpdate.mockClear();
    timer = new TabataTimer(broadcastUpdate);
  });

  afterEach(() => {
    vi.useRealTimers();
    timer.dispose();
  });

  // Test initial state
  it('should initialize with the correct default state', () => {
    const state = timer.getState();
    expect(state.mode).toBe('TABATA');
    expect(state.isRunning).toBe(false);
    expect(state.currentPhase).toBe('IDLE');
    expect(state.timeRemaining).toBe(20); // Default work duration
    expect(state.timeElapsed).toBe(0);
  });

  // Test mode switching
  it('should switch modes correctly', () => {
    timer.setMode('STOPWATCH');
    let state = timer.getState();
    expect(state.mode).toBe('STOPWATCH');
    expect(state.currentPhase).toBe('IDLE');
    expect(state.timeRemaining).toBe(0);

    timer.setMode('TABATA');
    state = timer.getState();
    expect(state.mode).toBe('TABATA');
    expect(state.timeRemaining).toBe(20); // Resets to work duration
  });

  // Test configuration
  it('should update configuration correctly', () => {
    timer.setConfig({ workDuration: 30, restDuration: 15 });
    const state = timer.getState();
    expect(state.workDuration).toBe(30);
    expect(state.restDuration).toBe(15);
    // If idle, timeRemaining should update
    expect(state.timeRemaining).toBe(30);
  });

  it('should throw a ConfigurationError for invalid durations', () => {
    expect(() => {
      timer.setConfig({ workDuration: -10, restDuration: 15 });
    }).toThrow(ConfigurationError);
    expect(() => {
      timer.setConfig({ workDuration: -10, restDuration: 15 });
    }).toThrow(
      'Invalid timer configuration: workDuration must be positive, and restDuration must be non-negative. Received workDuration: -10, restDuration: 15'
    );
  });

  // --- STOPWATCH MODE TESTS ---
  describe('Stopwatch Mode', () => {
    beforeEach(() => {
      timer.setMode('STOPWATCH');
    });

    it('should go through PREPARE and then start counting up', () => {
      timer.handleCommand('START');

      // Should be in PREPARE phase for 5 seconds
      let state = timer.getState();
      expect(state.currentPhase).toBe('PREPARE');
      expect(state.timeRemaining).toBe(5);

      // Advance time by 5 seconds to get past PREPARE
      vi.advanceTimersByTime(5000);
      state = timer.getState();
      expect(state.currentPhase).toBe('RUNNING');

      // Advance another 3 seconds
      vi.advanceTimersByTime(3000);
      state = timer.getState();
      expect(state.timeElapsed).toBe(3);
    });

    it('should pause and resume correctly', () => {
      timer.handleCommand('START');
      vi.advanceTimersByTime(8000); // 5s PREPARE + 3s RUNNING

      timer.handleCommand('PAUSE');
      let state = timer.getState();
      expect(state.isRunning).toBe(false);
      expect(state.currentPhase).toBe('RUNNING');
      expect(state.timeElapsed).toBe(3);

      // Time should not advance while paused
      vi.advanceTimersByTime(5000);
      expect(timer.getState().timeElapsed).toBe(3);

      timer.handleCommand('START'); // Resume
      vi.advanceTimersByTime(4000);
      state = timer.getState();
      expect(state.isRunning).toBe(true);
      expect(state.timeElapsed).toBe(7);
    });

    it('should stop and reset', () => {
      timer.handleCommand('START');
      vi.advanceTimersByTime(10000); // 5s PREPARE + 5s RUNNING

      timer.handleCommand('STOP');
      const state = timer.getState();
      expect(state.isRunning).toBe(false);
      expect(state.currentPhase).toBe('IDLE');
      expect(state.timeElapsed).toBe(0);
    });
  });

  // --- TABATA MODE TESTS ---
  describe('Tabata Mode', () => {
    beforeEach(() => {
      timer.setMode('TABATA');
      timer.setConfig({ workDuration: 10, restDuration: 5 });
    });

    it('should transition from PREPARE to WORK to REST', () => {
      timer.handleCommand('START');

      // PREPARE (5s)
      expect(timer.getState().currentPhase).toBe('PREPARE');
      vi.advanceTimersByTime(5000);

      // WORK (10s)
      let state = timer.getState();
      expect(state.currentPhase).toBe('WORK');
      expect(state.timeRemaining).toBe(10);
      vi.advanceTimersByTime(10000);

      // REST (5s)
      state = timer.getState();
      expect(state.currentPhase).toBe('REST');
      expect(state.timeRemaining).toBe(5);
      vi.advanceTimersByTime(5000);

      // Back to WORK
      state = timer.getState();
      expect(state.currentPhase).toBe('WORK');
      expect(state.timeRemaining).toBe(10);
    });

    it('should handle pause and resume', () => {
      timer.handleCommand('START');
      vi.advanceTimersByTime(7000); // 5s PREPARE + 2s WORK

      timer.handleCommand('PAUSE');
      let state = timer.getState();
      expect(state.isRunning).toBe(false);
      expect(state.timeRemaining).toBe(8); // 10 - 2 = 8

      vi.advanceTimersByTime(3000); // Should not advance
      expect(timer.getState().timeRemaining).toBe(8);

      timer.handleCommand('START'); // Resume
      vi.advanceTimersByTime(8000); // Finish the WORK phase

      state = timer.getState();
      expect(state.currentPhase).toBe('REST');
      expect(state.timeRemaining).toBe(5);
    });
  });

  // --- Sound Tests ---
  it('should queue sounds at appropriate times', () => {
    timer.setConfig({ workDuration: 3, restDuration: 3 });
    timer.handleCommand('START');

    // Countdown sounds
    vi.advanceTimersByTime(2000); // 3s left in PREPARE
    expect(broadcastUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ soundToPlay: 'COUNTDOWN' }),
      })
    );

    vi.advanceTimersByTime(3000); // End of PREPARE
    expect(broadcastUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ soundToPlay: 'WORK' }),
      })
    );

    vi.advanceTimersByTime(3000); // End of WORK
    expect(broadcastUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ soundToPlay: 'REST' }),
      })
    );
  });
});
