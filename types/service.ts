// types/service.ts

import { SpotifyData, TimerData, TimerMode } from './websocket.js'

/**
 * A generic service interface.
 */
export interface Service {
  getState(): unknown
  cleanup?(): void
}

/**
 * The Spotify polling service interface.
 */
export interface SpotifyService extends Service {
  getState(): SpotifyData
  handleCommand(
    command:
      | 'PLAY'
      | 'PAUSE'
      | 'NEXT'
      | 'PREVIOUS'
      | 'TRANSFER_PLAYBACK'
      | 'SET_VOLUME'
      | 'GET_DEVICES',
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ): void
  setRefreshToken(token: string): void
  startPolling(): void
  stopPolling(): void
  isReady(): boolean
  forcePollAndBroadcast(): void
}

/**
 * The Tabata timer service interface.
 */
export interface TimerService extends Service {
  getState(): TimerData
  handleCommand(command: 'START' | 'PAUSE' | 'STOP'): void
  setConfig(config: { workDuration: number; restDuration: number }): void
  setMode(mode: TimerMode): void
}
