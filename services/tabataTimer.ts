// File: services/tabataTimer.ts (Event-Sourced Timer Service)

import { TimerEventStore } from './timer/eventStore'
import { TimerState } from './timer/reducer'
import {
  ServerMessage,
  TimerData,
  TimerMode,
  TimerPhase,
} from '../types/websocket'
import logger from '../utils/logger'

const TICK_INTERVAL = 200 // ms

type TimerCommand = 'START' | 'PAUSE' | 'STOP'

export class TabataTimer {
  private eventStore: TimerEventStore
  private broadcastUpdate: (message: ServerMessage) => void
  private tickInterval: NodeJS.Timeout | null = null
  private soundEventId = 0
  private lastPlayedSoundAt: number | null = null

  private constructor(
    eventStore: TimerEventStore,
    broadcastUpdate: (message: ServerMessage) => void
  ) {
    this.eventStore = eventStore
    this.broadcastUpdate = broadcastUpdate
    if (this.getState().isRunning) {
      this.startTicking()
    }
  }

  public static async create(
    broadcastUpdate: (message: ServerMessage) => void
  ): Promise<TabataTimer> {
    const eventStore = await TimerEventStore.create()
    return new TabataTimer(eventStore, broadcastUpdate)
  }

  private getState(): TimerState {
    return this.eventStore.getState()
  }

  public getTimerData(): TimerData {
    const state = this.calculateCurrentState()
    const soundToPlay = this.getSoundToPlay(state)

    return {
      isRunning: state.isRunning,
      currentPhase: state.phase,
      timeRemaining: state.timeRemaining,
      timeElapsed: this.getTimeElapsed(state),
      mode: state.mode,
      workDuration: state.workDuration,
      restDuration: state.restDuration,
      soundToPlay,
      soundEventId: this.soundEventId,
    }
  }

  private calculateCurrentState(): TimerState {
    const state = this.getState()
    if (!state.isRunning) {
      return state
    }

    const now = Date.now()
    const elapsedTime = now - state.startTime
    const timeRemaining = (state.targetDuration ?? 0) - elapsedTime

    const currentState: TimerState = {
      ...state,
      timeRemaining: Math.max(0, timeRemaining),
    }

    if (currentState.timeRemaining <= 0) {
      return this.transitionPhase(currentState)
    }

    return currentState
  }

  private transitionPhase(currentState: TimerState): TimerState {
    let nextPhase: TimerPhase = currentState.phase
    let nextTargetDuration: number | null = null

    if (currentState.mode === 'STOPWATCH') {
      return currentState
    }

    switch (currentState.phase) {
      case 'PREPARE':
        nextPhase = 'WORK'
        nextTargetDuration = currentState.workDuration
        break
      case 'WORK':
        nextPhase = 'REST'
        nextTargetDuration = currentState.restDuration
        break
      case 'REST':
        nextPhase = 'WORK'
        nextTargetDuration = currentState.workDuration
        break
      default:
        return { ...currentState, isRunning: false }
    }

    const now = Date.now()
    return {
      ...currentState,
      phase: nextPhase,
      startTime: now,
      targetDuration: nextTargetDuration,
      timeRemaining: nextTargetDuration ?? 0,
    }
  }

  private getTimeElapsed(state: TimerState): number {
    if (state.mode !== 'STOPWATCH') {
      return 0
    }
    if (!state.isRunning) {
      return state.timeRemaining
    }
    const now = Date.now()
    return state.timeRemaining + (now - state.startTime)
  }

  private getSoundToPlay(
    state: TimerState
  ): 'WORK' | 'REST' | 'COUNTDOWN' | undefined {
    if (!state.isRunning) {
      return undefined
    }

    const timeRemainingSeconds = Math.ceil(state.timeRemaining / 1000)

    if (this.lastPlayedSoundAt !== state.startTime) {
      this.lastPlayedSoundAt = state.startTime
      this.soundEventId++
      switch (state.phase) {
        case 'WORK':
          return 'WORK'
        case 'REST':
          return 'REST'
      }
    }

    if (
      timeRemainingSeconds >= 1 &&
      timeRemainingSeconds <= 3 &&
      this.lastPlayedSoundAt !== timeRemainingSeconds
    ) {
      this.lastPlayedSoundAt = timeRemainingSeconds
      this.soundEventId++
      return 'COUNTDOWN'
    }

    return undefined
  }

  private broadcast() {
    this.broadcastUpdate({ type: 'TIMER_UPDATE', payload: this.getTimerData() })
  }

  private startTicking() {
    if (this.tickInterval) return
    this.tickInterval = setInterval(() => {
      this.broadcast()
    }, TICK_INTERVAL)
  }

  private stopTicking() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  public async handleCommand(command: TimerCommand) {
    const now = Date.now()
    switch (command) {
      case 'START':
        await this.eventStore.dispatch({ type: 'START', startTime: now })
        this.startTicking()
        break
      case 'PAUSE':
        await this.eventStore.dispatch({ type: 'PAUSE', pauseTime: now })
        this.stopTicking()
        break
      case 'STOP':
        await this.eventStore.dispatch({ type: 'STOP', stopTime: now })
        this.stopTicking()
        break
      default:
        logger.warn(`Unknown timer command: ${command}`)
        return
    }
    this.broadcast()
  }

  public async setConfig(config: { workDuration: number; restDuration: number }) {
    await this.eventStore.dispatch({
      type: 'SET_CONFIG',
      workDuration: config.workDuration,
      restDuration: config.restDuration,
    })
    this.broadcast()
  }

  public async setMode(mode: TimerMode) {
    await this.eventStore.dispatch({ type: 'SET_MODE', mode })
    this.broadcast()
  }

  public dispose() {
    this.stopTicking()
  }
}
