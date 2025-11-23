// File: services/tabataTimer.ts
import {
  TimerData,
  TimerMode,
  UnifiedStateMessage,
} from '../types/websocket'
import { TimerEventStore } from './timer/eventStore'

/**
 * @fileoverview This file contains the TabataTimer class, which is responsible
 * for managing the timer's lifecycle and dispatching events to the TimerEventStore.
 * It acts as the interface between the WebSocket manager and the timer's state logic.
 */

type TimerCommand = 'START' | 'PAUSE' | 'STOP'

class TabataTimer {
  private eventStore: TimerEventStore
  private interval: NodeJS.Timeout | null = null
  private broadcastState: (data: Partial<UnifiedStateMessage>) => void

  constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
    this.broadcastState = broadcastState
    this.eventStore = new TimerEventStore(this.broadcastState)
  }

  private tick = () => {
    this.eventStore.record({ type: 'TICK' })
    const state = this.eventStore.getState()
    if (!state.isRunning) {
      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    }
  }

  public handleCommand(command: TimerCommand) {
    switch (command) {
      case 'START':
        this.eventStore.record({ type: 'START' })
        if (!this.interval) {
          this.interval = setInterval(this.tick, 1000)
        }
        break
      case 'PAUSE':
        this.eventStore.record({ type: 'PAUSE' })
        if (this.interval) {
          clearInterval(this.interval)
          this.interval = null
        }
        break
      case 'STOP':
        this.eventStore.record({ type: 'STOP' })
        if (this.interval) {
          clearInterval(this.interval)
          this.interval = null
        }
        break
      default:
        console.warn(`Unknown timer command: ${command}`)
    }
  }

  public setMode(mode: TimerMode) {
    this.eventStore.record({ type: 'SET_MODE', mode })
  }

  public setConfig(config: { workDuration: number; restDuration: number }) {
    this.eventStore.record({
      type: 'SET_CONFIG',
      workDuration: config.workDuration,
      restDuration: config.restDuration,
    })
  }

  public getState(): TimerData {
    const state = this.eventStore.getState()
    return {
      isRunning: state.isRunning,
      currentPhase: state.phase,
      timeRemaining: state.timeRemaining,
      timeElapsed: state.timeElapsed,
      mode: state.mode,
      workDuration: state.workDuration,
      restDuration: state.restDuration,
      soundToPlay: state.soundToPlay,
      soundEventId: state.soundEventId,
    }
  }
}

export default TabataTimer
