// File: services/tabataTimer.ts (Tabata Timer Service - Typed)
/**
 * Tabata Timer Service: Manages the internal state machine for the workout timer.
 * Pushes updates to the WebSocket manager via the injected broadcast function.
 */
import { TimerData, UnifiedStateMessage } from '../types/websocket';

const DEFAULT_CYCLES = 8;
const WORK_DURATION = 30; // seconds
const REST_DURATION = 10; // seconds
const COOLDOWN_DURATION = 5; // seconds

type TimerCommand = 'START' | 'PAUSE' | 'STOP';

class TabataTimer {
    // Function provided by server.js to push updates to all clients
    private broadcastState: (data: Partial<UnifiedStateMessage>) => void;
    private interval: NodeJS.Timeout | null = null;
    private state: TimerData = {
        isRunning: false,
        currentPhase: 'IDLE',
        timeRemaining: 0,
        cycle: 0,
        totalCycles: DEFAULT_CYCLES,
    };

    constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
        this.broadcastState = broadcastState;
        console.log('Tabata Timer Service Initialized.');
    }

    public getState(): TimerData {
        return { ...this.state };
    }

    // --- Core Timer Logic ---

    private tick = () => {
        if (!this.state.isRunning) return;

        this.state.timeRemaining -= 1;

        if (this.state.timeRemaining <= 0) {
            this.transitionPhase();
        }

        // Broadcast the entire timer state on every tick
        this.broadcastState({ timerData: this.getState() });
    }

    private startTimer() {
        if (this.state.isRunning) return;

        if (this.state.currentPhase === 'IDLE') {
            this.state.cycle = 1;
            this.state.currentPhase = 'WORK';
            this.state.timeRemaining = WORK_DURATION;
        }

        this.state.isRunning = true;
        this.interval = setInterval(this.tick, 1000);
        console.log(`Timer started: ${this.state.currentPhase} Cycle ${this.state.cycle}`);
        this.broadcastState({ timerData: this.getState() });
    }

    private pauseTimer() {
        if (!this.state.isRunning) return;
        this.state.isRunning = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        console.log('Timer paused.');
        this.broadcastState({ timerData: this.getState() });
    }
    
    private stopTimer() {
        this.state.isRunning = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;

        this.state = {
            isRunning: false,
            currentPhase: 'IDLE',
            timeRemaining: 0,
            cycle: 0,
            totalCycles: DEFAULT_CYCLES,
        };
        console.log('Timer stopped and reset.');
        this.broadcastState({ timerData: this.getState() });
    }

    private transitionPhase() {
        switch (this.state.currentPhase) {
            case 'WORK':
                if (this.state.cycle < this.state.totalCycles) {
                    this.state.currentPhase = 'REST';
                    this.state.timeRemaining = REST_DURATION;
                    console.log(`Transition to REST for cycle ${this.state.cycle}`);
                } else {
                    this.state.currentPhase = 'COOLDOWN';
                    this.state.timeRemaining = COOLDOWN_DURATION;
                    this.pauseTimer(); // Auto-pause after last cycle
                    console.log('Tabata finished. Transition to COOLDOWN.');
                }
                break;
            case 'REST':
                this.state.cycle += 1;
                this.state.currentPhase = 'WORK';
                this.state.timeRemaining = WORK_DURATION;
                console.log(`Transition to WORK for cycle ${this.state.cycle}`);
                break;
            case 'IDLE':
            case 'COOLDOWN':
                this.stopTimer();
                break;
        }
    }

    // --- Command Handler (Used by socketManager) ---
    public handleCommand(command: TimerCommand) {
        switch (command) {
            case 'START':
                this.startTimer();
                break;
            case 'PAUSE':
                this.pauseTimer();
                break;
            case 'STOP':
                this.stopTimer();
                break;
            default:
                console.warn(`Unknown timer command: ${command}`);
        }
    }
}

export default TabataTimer;