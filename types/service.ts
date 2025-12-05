import { TimerData, TimerMode, SpotifyData } from './websocket';

type TimerCommand = 'START' | 'PAUSE' | 'STOP';

export interface ITabataTimer {
  getState(): TimerData;
  handleCommand(command: TimerCommand): void;
  setConfig(config: { workDuration: number; restDuration: number }): void;
  setMode(mode: TimerMode): void;
}

type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'
  | 'GET_DEVICES';

export interface ISpotifyPolling {
  getState(): SpotifyData;
  isReady(): boolean;
  handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ): Promise<void>;
  startPolling(): void;
  stopPolling(): void;
  setRefreshToken(token: string): void;
  forcePollAndBroadcast(): Promise<void>;
}
