// File: types/websocket.ts (Shared TypeScript Data Contracts)
/**
 * Defines the strict interfaces for all data passed between the server services
 * and the client hooks via the WebSocket connection.
 */

// --- Server Broadcast State Interfaces ---

export interface HrmData {
    value: number;
    maxHr: number;
    name?: string;
    age?: number;
}
export interface TimerData {
    isRunning: boolean;
    currentPhase: 'WORK' | 'REST' | 'IDLE' | 'COOLDOWN';
    timeRemaining: number;
    cycle: number;
    totalCycles: number;
    soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN';
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
    type: 'STATE_UPDATE';
    hrmData: HrmData;
    timerData: TimerData;
    spotifyData: SpotifyData;
}


// --- Client Input Command Interfaces ---

export interface HrmInputMessage {
    type: 'HRM_INPUT';
    data: HrmData;
}
export interface TimerCommandMessage {
    type: 'TIMER_COMMAND';
    command: 'START' | 'PAUSE' | 'STOP';
}
export interface SpotifyCommandMessage {
    type: 'SPOTIFY_COMMAND';
    command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS';
}

/**
 * Union type for all possible messages the client can send to the server.
 */
export type ClientCommandMessage = HrmInputMessage | TimerCommandMessage | SpotifyCommandMessage;
