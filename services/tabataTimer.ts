// File: services/tabataTimer.ts
/**
 * Tabata Timer Service (Timestamp-Based / Resumable)
 * Refactored to use declarative state (start time) instead of imperative counters.
 * Persists state to disk to survive server restarts/deployments.
 */

import fs from 'fs'
import path from 'path'
import {
  TabataConfig,
  TimerData,
  UnifiedStateMessage,
} from '../types/websocket.js' // Ensure .js extension for Node ESM

const STATE_FILE = path.join(process.cwd(), 'logs', 'timer_state.json')

interface PersistedState {
  mode: 'TABATA' | 'STOPWATCH' | 'IDLE'
  isRunning: boolean
  startTime: number | null // The "Source of Truth" timestamp
  pausedAt: number | null // Timestamp when pause occurred (to calculate offset)
  accumulatedElapsed: number // Time already passed before the last pause
  config: TabataConfig
}

const DEFAULT_CONFIG: TabataConfig = {
  workDuration: 20,
  restDuration: 10,
  totalCycles: 8,
}

export default class TabataTimer {
  private broadcastState: (data: Partial<UnifiedStateMessage>) => void
  private interval: NodeJS.Timeout | null = null

  // The simplified, resilient state object
  private persistentState: PersistedState = {
    mode: 'IDLE',
    isRunning: false,
    startTime: null,
    pausedAt: null,
    accumulatedElapsed: 0,
    config: { ...DEFAULT_CONFIG },
  }

  // Cache last derived state to detect phase transitions (for sound effects)
  private lastDerivedState: TimerData | null = null

  constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
    this.broadcastState = broadcastState

    // 1. Attempt to restore state from disk on server boot
    this.loadState()

    // 2. If we were running before the restart, resume immediately
    if (this.persistentState.isRunning) {
      console.log('🔄 TabataTimer: Resuming active workout from persisted state.')
      // Adjust startTime to account for the downtime during server restart?
      // Strict resumable logic: The clock kept ticking while server was down.
      // If you want "pause while server down", that logic is more complex.
      // We will assume "clock kept ticking" (Real-time).
      this.startTickLoop()
    }
  }

  // --- Persistence ---

  private saveState() {
    try {
      // Ensure logs dir exists (redundant if Docker mount exists, but safe)
      const dir = path.dirname(STATE_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      fs.writeFileSync(STATE_FILE, JSON.stringify(this.persistentState, null, 2))
    } catch (e) {
      console.error('Failed to save timer state:', e)
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8')
        const data = JSON.parse(raw)
        // Basic validation could go here
        this.persistentState = { ...this.persistentState, ...data }
      }
    } catch (e) {
      console.warn('Failed to load timer state (starting fresh):', e)
    }
  }

  // --- Core Logic: The "Tick" ---

  private startTickLoop() {
    if (this.interval) clearInterval(this.interval)
    // Run at 200ms to ensure the UI feels responsive, though math is ms-perfect
    this.interval = setInterval(this.tick, 200)
  }

  private tick = () => {
    const currentState = this.getDerivedState()

    // Sound Logic: Trigger if phase changes
    if (
      this.lastDerivedState &&
      currentState.currentPhase !== this.lastDerivedState.currentPhase
    ) {
      // In a real app, you might emit a specific 'SOUND_EVENT' here
      // For now, the client observes the phase change
    }

    this.lastDerivedState = currentState
    this.broadcastState({ timerData: currentState })

    // Auto-stop if finished
    if (
      currentState.mode === 'TABATA' &&
      currentState.currentPhase === 'FINISHED' &&
      this.persistentState.isRunning
    ) {
      this.stop()
    }
  }

  /**
   * Calculates the current state of the workout based on `Date.now()`.
   * Pure function behavior based on persistentState.
   */
  public getDerivedState(): TimerData {
    const { mode, isRunning, startTime, accumulatedElapsed, config } = this.persistentState

    // 1. Idle / Not Running
    if (mode === 'IDLE') {
      return {
        isRunning: false,
        mode: 'IDLE',
        currentPhase: 'IDLE',
        timeRemaining: 0,
        timeElapsed: 0,
        cycle: 0,
        totalCycles: config.totalCycles,
      }
    }

    // 2. Calculate Total Elapsed Time
    // If running: (Now - Start) + PreviouslyElapsed
    // If paused: PreviouslyElapsed
    let totalElapsedSec = accumulatedElapsed
    if (isRunning && startTime) {
      const currentSessionMs = Date.now() - startTime
      totalElapsedSec += currentSessionMs / 1000
    }

    // 3. Stopwatch Logic
    if (mode === 'STOPWATCH') {
      return {
        isRunning,
        mode: 'STOPWATCH',
        currentPhase: totalElapsedSec < 5 ? 'PREPARE' : 'WORK',
        timeRemaining: 0, // Stopwatch counts up
        timeElapsed: Math.floor(totalElapsedSec),
        cycle: 0,
        totalCycles: 0,
      }
    }

    // 4. Tabata Math
    // Phase 1: Preparation (First 5 seconds fixed)
    const PREP_TIME = 5
    if (totalElapsedSec < PREP_TIME) {
      return {
        isRunning,
        mode: 'TABATA',
        currentPhase: 'PREPARE',
        timeRemaining: Math.ceil(PREP_TIME - totalElapsedSec),
        timeElapsed: Math.floor(totalElapsedSec),
        cycle: 1,
        totalCycles: config.totalCycles,
      }
    }

    // Phase 2: The Workout Loop
    const workoutTime = totalElapsedSec - PREP_TIME
    const cycleDuration = config.workDuration + config.restDuration
    const totalWorkoutDuration = cycleDuration * config.totalCycles

    // Check if finished
    if (workoutTime >= totalWorkoutDuration) {
      return {
        isRunning: false, // It's effectively done
        mode: 'TABATA',
        currentPhase: 'FINISHED',
        timeRemaining: 0,
        timeElapsed: Math.floor(totalElapsedSec),
        cycle: config.totalCycles,
        totalCycles: config.totalCycles,
      }
    }

    // Determine Cycle & Phase
    const currentCycleIndex = Math.floor(workoutTime / cycleDuration)
    const timeInCurrentCycle = workoutTime % cycleDuration
    const isWork = timeInCurrentCycle < config.workDuration

    return {
      isRunning,
      mode: 'TABATA',
      currentPhase: isWork ? 'WORK' : 'REST',
      timeRemaining: Math.ceil(
        isWork
          ? config.workDuration - timeInCurrentCycle
          : cycleDuration - timeInCurrentCycle
      ),
      timeElapsed: Math.floor(totalElapsedSec),
      cycle: currentCycleIndex + 1,
      totalCycles: config.totalCycles,
    }
  }

  // --- Public Commands ---

  public start(config?: TabataConfig) {
    if (this.persistentState.isRunning) return

    // If starting fresh (IDLE) or explicitly restarting
    if (this.persistentState.mode === 'IDLE' || config) {
      this.persistentState.mode = 'TABATA'
      this.persistentState.accumulatedElapsed = 0
      if (config) this.persistentState.config = config
    }

    this.persistentState.isRunning = true
    this.persistentState.startTime = Date.now()
    this.persistentState.pausedAt = null

    this.saveState()
    this.startTickLoop()
    this.tick() // Immediate update
  }

  public startStopwatch() {
    if (this.persistentState.isRunning && this.persistentState.mode === 'STOPWATCH') return

    this.persistentState.mode = 'STOPWATCH'
    this.persistentState.isRunning = true
    this.persistentState.startTime = Date.now()
    this.persistentState.accumulatedElapsed = 0
    this.persistentState.pausedAt = null

    this.saveState()
    this.startTickLoop()
    this.tick()
  }

  public pause() {
    if (!this.persistentState.isRunning || !this.persistentState.startTime) return

    // Calculate how much time passed during this active burst
    const sessionDurationSec = (Date.now() - this.persistentState.startTime) / 1000

    this.persistentState.isRunning = false
    this.persistentState.accumulatedElapsed += sessionDurationSec
    this.persistentState.startTime = null // Clear start time as we are no longer "ticking"
    this.persistentState.pausedAt = Date.now()

    this.saveState()
    if (this.interval) clearInterval(this.interval)
    this.tick() // Broadcast the paused state
  }

  public stop() {
    this.persistentState.mode = 'IDLE'
    this.persistentState.isRunning = false
    this.persistentState.startTime = null
    this.persistentState.pausedAt = null
    this.persistentState.accumulatedElapsed = 0

    this.saveState()
    if (this.interval) clearInterval(this.interval)
    this.tick()
  }

  /**
   * Returns true if the timer is currently active
   */
  public isActive(): boolean {
    return this.persistentState.isRunning
  }
}
