// File: services/tabataTimer.ts
import fs from 'fs'
import path from 'path'
import { TabataConfig, TimerData, UnifiedStateMessage } from '../types/websocket.js'

const STATE_FILE = path.join(process.cwd(), 'logs', 'timer_state.json')

interface PersistedState {
  mode: 'TABATA' | 'STOPWATCH' | 'IDLE'
  isRunning: boolean
  startTime: number | null
  pausedAt: number | null
  accumulatedElapsed: number
  config: TabataConfig
}

const DEFAULT_CONFIG: TabataConfig = {
  workDuration: 20, restDuration: 10, totalCycles: 8
}

export default class TabataTimer {
  private persistentState: PersistedState = {
    mode: 'IDLE', isRunning: false, startTime: null, pausedAt: null, accumulatedElapsed: 0, config: { ...DEFAULT_CONFIG }
  }
  private lastDerivedState: TimerData | null = null
  private interval: NodeJS.Timeout | null = null

  constructor(private broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
    this.loadState()
    if (this.persistentState.isRunning) this.startTickLoop()
  }

  // --- Persistence ---
  private saveState() {
    try {
      const dir = path.dirname(STATE_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.persistentState))
    } catch (e) { console.error('Save failed:', e) }
  }

  private loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        this.persistentState = { ...this.persistentState, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) }
      }
    } catch (e) { console.warn('Load failed:', e) }
  }

  // --- Logic ---
  private startTickLoop() {
    if (this.interval) clearInterval(this.interval)
    this.interval = setInterval(this.tick, 200)
  }

  private tick = () => {
    const currentState = this.getDerivedState()
    this.lastDerivedState = currentState
    this.broadcastState({ timerData: currentState })

    if (currentState.mode === 'TABATA' && currentState.currentPhase === 'FINISHED' && this.persistentState.isRunning) {
      this.stop()
    }
  }

  public getDerivedState(): TimerData {
    const { mode, isRunning, startTime, accumulatedElapsed, config } = this.persistentState

    if (mode === 'IDLE') return { isRunning: false, mode: 'IDLE', currentPhase: 'IDLE', timeRemaining: 0, timeElapsed: 0, cycle: 0, totalCycles: config.totalCycles }

    let totalElapsed = accumulatedElapsed
    if (isRunning && startTime) totalElapsed += (Date.now() - startTime) / 1000

    if (mode === 'STOPWATCH') return { isRunning, mode: 'STOPWATCH', currentPhase: totalElapsed < 5 ? 'PREPARE' : 'WORK', timeRemaining: 0, timeElapsed: Math.floor(totalElapsed), cycle: 0, totalCycles: 0 }

    // TABATA Logic
    if (totalElapsed < 5) return { isRunning, mode: 'TABATA', currentPhase: 'PREPARE', timeRemaining: Math.ceil(5 - totalElapsed), timeElapsed: Math.floor(totalElapsed), cycle: 1, totalCycles: config.totalCycles }

    const workoutTime = totalElapsed - 5
    const cycleDur = config.workDuration + config.restDuration
    if (workoutTime >= cycleDur * config.totalCycles) return { isRunning: false, mode: 'TABATA', currentPhase: 'FINISHED', timeRemaining: 0, timeElapsed: Math.floor(totalElapsed), cycle: config.totalCycles, totalCycles: config.totalCycles }

    const cycleIndex = Math.floor(workoutTime / cycleDur)
    const cycleTime = workoutTime % cycleDur
    const isWork = cycleTime < config.workDuration

    return {
      isRunning, mode: 'TABATA',
      currentPhase: isWork ? 'WORK' : 'REST',
      timeRemaining: Math.ceil(isWork ? config.workDuration - cycleTime : cycleDur - cycleTime),
      timeElapsed: Math.floor(totalElapsed),
      cycle: cycleIndex + 1, totalCycles: config.totalCycles
    }
  }

  // --- Commands ---
  public start(config?: TabataConfig) {
    if (this.persistentState.isRunning) return
    if (this.persistentState.mode === 'IDLE' || config) {
      this.persistentState.mode = 'TABATA'; this.persistentState.accumulatedElapsed = 0;
      if (config) this.persistentState.config = config
    }
    this.persistentState.isRunning = true; this.persistentState.startTime = Date.now(); this.persistentState.pausedAt = null;
    this.saveState(); this.startTickLoop(); this.tick()
  }

  public startStopwatch() {
    if (this.persistentState.isRunning && this.persistentState.mode === 'STOPWATCH') return
    this.persistentState.mode = 'STOPWATCH'; this.persistentState.isRunning = true;
    this.persistentState.startTime = Date.now(); this.persistentState.accumulatedElapsed = 0; this.persistentState.pausedAt = null;
    this.saveState(); this.startTickLoop(); this.tick()
  }

  public pause() {
    if (!this.persistentState.isRunning || !this.persistentState.startTime) return
    this.persistentState.accumulatedElapsed += (Date.now() - this.persistentState.startTime) / 1000
    this.persistentState.isRunning = false; this.persistentState.startTime = null; this.persistentState.pausedAt = Date.now();
    this.saveState(); if (this.interval) clearInterval(this.interval); this.tick()
  }

  public stop() {
    this.persistentState.mode = 'IDLE'; this.persistentState.isRunning = false;
    this.persistentState.startTime = null; this.persistentState.pausedAt = null; this.persistentState.accumulatedElapsed = 0;
    this.saveState(); if (this.interval) clearInterval(this.interval); this.tick()
  }
}
