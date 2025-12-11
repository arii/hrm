// File: services/timer/eventStore.ts
import fs from 'fs/promises'
import path from 'path'
import { reducer, initialState, TimerState, TimerEvent } from './reducer'
import logger from '../../utils/logger'

const TIMER_STATE_FILE = path.join(process.cwd(), 'logs', 'timer_state.json')

// DistributiveOmit utility to correctly omit keys from a discriminated union
export type DistributiveOmit<T, K extends string | number | symbol> = T extends any
  ? Omit<T, K>
  : never

export type PersistedEvent = DistributiveOmit<TimerEvent, 'TICK'> & {
  timestamp: number
}

interface PersistedState {
  events: PersistedEvent[]
}

export class TimerEventStore {
  private state: TimerState = initialState
  private events: PersistedEvent[] = []

  // The broadcast function is no longer needed here
  private constructor() {}

  // The factory function no longer needs the broadcast function
  public static async create(): Promise<TimerEventStore> {
    const store = new TimerEventStore()
    await store.loadFromDisk()
    return store
  }

  public getState(): TimerState {
    return this.state
  }

  public async dispatch(event: DistributiveOmit<TimerEvent, 'TICK'>) {
    const timestamp = Date.now()
    const newPersistedEvent: PersistedEvent = { ...event, timestamp }
    this.events.push(newPersistedEvent)
    this.state = reducer(this.state, event as TimerEvent)
    await this.persistToDisk()
    // Broadcasting is now handled by the main service
  }

  public tick(event: TimerEvent) {
    this.state = reducer(this.state, event)
    // No persistence or broadcasting for ticks
  }

  private async persistToDisk() {
    try {
      const stateToPersist: PersistedState = { events: this.events }
      await fs.writeFile(
        TIMER_STATE_FILE,
        JSON.stringify(stateToPersist, null, 2),
        'utf-8'
      )
    } catch (error) {
      logger.error({ err: error }, 'Failed to persist timer state to disk.')
    }
  }

  private async loadFromDisk() {
    try {
      const data = await fs.readFile(TIMER_STATE_FILE, 'utf-8')
      const persistedState: PersistedState = JSON.parse(data)

      if (persistedState.events) {
        this.events = persistedState.events
        this.state = this.events.reduce(reducer, initialState)
        logger.info(
          `Successfully loaded and rebuilt ${this.events.length} timer events from disk.`
        )
      }
    } catch (error: unknown) {
      const fsError = error as NodeJS.ErrnoException
      if (fsError.code === 'ENOENT') {
        logger.warn(
          `Timer state file not found at ${TIMER_STATE_FILE}. Starting with a clean state.`
        )
        this.events = []
        this.state = initialState
      } else {
        logger.error({ err: fsError }, 'Failed to load timer state from disk.')
      }
    }
  }
}
