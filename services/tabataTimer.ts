// File: services/tabataTimer.ts (Tabata Timer Service - Typed)
/**
 * Tabata Timer Service: Manages the internal state machine for the workout timer.
 * Pushes updates to the WebSocket manager via the injected broadcast function.
 */
import { TimerData, UnifiedStateMessage } from "../types/websocket";

const DEFAULT_CYCLES = 8;
const WORK_DURATION = 30; // seconds
const REST_DURATION = 10; // seconds
const COOLDOWN_DURATION = 5; // seconds

type TimerCommand = "START" | "PAUSE" | "STOP";

interface TimerConfig {
  workDuration?: number;
  restDuration?: number;
  totalCycles?: number;
}

class TabataTimer {
  // Function provided by server.js to push updates to all clients
  private broadcastState: (data: Partial<UnifiedStateMessage>) => void;
  private interval: NodeJS.Timeout | null = null;

  // Current timer configuration (can be updated on START)
  private workDuration: number = WORK_DURATION;
  private restDuration: number = REST_DURATION;

  private state: TimerData = {
    isRunning: false,
    currentPhase: "IDLE",
    timeRemaining: 0,
    cycle: 0,
    totalCycles: DEFAULT_CYCLES,
  };

  constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
    this.broadcastState = broadcastState;
    console.log("Tabata Timer Service Initialized.");
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
    if (this.state.timeRemaining <= 3 && this.state.timeRemaining > 0) {
      this.state.soundToPlay = "COUNTDOWN";
    } else {
      this.state.soundToPlay = undefined;
    }
    this.broadcastState({ timerData: this.getState() });
  };

  private startTimer(config?: TimerConfig) {
    if (this.state.isRunning) return;

    // Apply new configuration if provided
    if (config) {
      if (config.workDuration !== undefined) {
        this.workDuration = config.workDuration;
      }
      if (config.restDuration !== undefined) {
        this.restDuration = config.restDuration;
      }
      if (config.totalCycles !== undefined) {
        this.state.totalCycles = config.totalCycles;
      }
    }

    if (this.state.currentPhase === "IDLE") {
      this.state.cycle = 1;
      this.state.currentPhase = "WORK";
      this.state.timeRemaining = this.workDuration;
    }

    this.state.isRunning = true;
    this.interval = setInterval(this.tick, 1000);
    console.log(
      `Timer started: ${this.state.currentPhase} Cycle ${this.state.cycle}/${this.state.totalCycles} (Work: ${this.workDuration}s, Rest: ${this.restDuration}s)`
    );
    this.broadcastState({ timerData: this.getState() });
  }

  private pauseTimer() {
    if (!this.state.isRunning) return;
    this.state.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    console.log("Timer paused.");
    this.broadcastState({ timerData: this.getState() });
  }

  private stopTimer() {
    this.state.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;

    this.state = {
      isRunning: false,
      currentPhase: "IDLE",
      timeRemaining: 0,
      cycle: 0,
      totalCycles: DEFAULT_CYCLES,
    };
    console.log("Timer stopped and reset.");
    this.broadcastState({ timerData: this.getState() });
  }

  private transitionPhase() {
    this.state.soundToPlay = undefined; // Reset sound on phase transition
    switch (this.state.currentPhase) {
      case "WORK":
        if (this.state.cycle < this.state.totalCycles) {
          this.state.currentPhase = "REST";
          this.state.timeRemaining = this.restDuration;
          this.state.soundToPlay = "REST";
          console.log(`Transition to REST for cycle ${this.state.cycle}`);
        } else {
          this.state.currentPhase = "COOLDOWN";
          this.state.timeRemaining = COOLDOWN_DURATION;
          this.pauseTimer(); // Auto-pause after last cycle
          console.log("Tabata finished. Transition to COOLDOWN.");
        }
        break;
      case "REST":
        this.state.cycle += 1;
        this.state.currentPhase = "WORK";
        this.state.timeRemaining = this.workDuration;
        this.state.soundToPlay = "WORK";
        console.log(`Transition to WORK for cycle ${this.state.cycle}`);
        break;
      case "IDLE":
      case "COOLDOWN":
        this.stopTimer();
        break;
    }
  }

  // --- Command Handler (Used by socketManager) ---
  public handleCommand(command: TimerCommand, config?: TimerConfig) {
    switch (command) {
      case "START":
        this.startTimer(config);
        break;
      case "PAUSE":
        this.pauseTimer();
        break;
      case "STOP":
        this.stopTimer();
        break;
      default:
        console.warn(`Unknown timer command: ${command}`);
    }
  }
}

export default TabataTimer;
