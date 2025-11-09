// File: types/websocket.ts (Shared TypeScript Data Contracts)
/**
 * Defines the strict interfaces for all data passed between the server services
 * and the client hooks via the WebSocket connection.
 */

// --- Server Broadcast State Interfaces ---

export interface HrmData {
  clientId: string;
  value: number;
  maxHr: number;
  name?: string;
  age?: number;
}
export interface TimerData {
  isRunning: boolean;
  currentPhase: "WORK" | "REST" | "IDLE" | "COOLDOWN";
  timeRemaining: number;
  cycle: number;
  totalCycles: number;
  soundToPlay?: "WORK" | "REST" | "COUNTDOWN";
}
export interface SpotifyData {
  trackName: string;
  artist: string;
  isPlaying: boolean;
}

/**
 * The single, unified state object broadcast by the server to all clients.
 */
export interface UnifiedStateMessage {
  type: "STATE_UPDATE";
  hrmData: HrmData[];
  timerData: TimerData;
  spotifyData: SpotifyData;
}

/**
 * BroadcastData: a small, optional-shaped payload that services may send to
 * the socket broadcaster. This mirrors the ad-hoc interface previously found
 * inside the compiled `server.js` and centralizes it here for reuse.
 */
/**
 * BroadcastData is the shape sent by server services into the broadcaster.
 * Use the canonical UnifiedStateMessage where possible; here we expose a
 * lightweight alias so services can pass partial state updates.
 */
export type BroadcastData = Partial<UnifiedStateMessage>;

// --- Client Input Command Interfaces ---

export type HrmInputData = Omit<Partial<HrmData>, "clientId">;

export interface HrmInputMessage {
  type: "HRM_INPUT";
  data: HrmInputData;
}
export interface TimerCommandMessage {
  type: "TIMER_COMMAND";
  command: "START" | "PAUSE" | "STOP";
  // Optional configuration for START command
  workDuration?: number;
  restDuration?: number;
  totalCycles?: number;
}
export interface SpotifyCommandMessage {
  type: "SPOTIFY_COMMAND";
  command: "PLAY" | "PAUSE" | "NEXT" | "PREVIOUS";
}

/**
 * Union type for all possible messages the client can send to the server.
 */
export type ClientCommandMessage =
  | HrmInputMessage
  | TimerCommandMessage
  | SpotifyCommandMessage;
