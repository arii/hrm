// File: services/tabataTimer.ts (Dual-Mode Timer Service: Stopwatch & Tabata)
/**
 * Dual-Mode Timer Service: Manages both continuous elapsed time (Stopwatch)
 * and interval-based countdowns (Tabata). Includes a universal 5-second
 * PREPARE countdown that runs before both modes begin.
 * Pushes updates to the WebSocket manager via the injected broadcast function.
 */
import {
  TimerData,
  TimerMode,
  TimerPhase,
  UnifiedStateMessage,
} from "../types/websocket";

// --- Tabata Constants ---
const DEFAULT_CYCLES = 8;
const DEFAULT_WORK_DURATION = 30; // seconds
const DEFAULT_REST_DURATION = 10; // seconds
const COOLDOWN_DURATION = 5; // seconds
const START_COUNTDOWN_DURATION = 5; // seconds (5-second countdown before WORK or RUNNING)

type TimerCommand = "START" | "PAUSE" | "STOP";

// Internal state structure
interface DualModeTimerState {
  mode: TimerMode;
  isRunning: boolean;
  currentPhase: TimerPhase;
  timeElapsed: number; // For Stopwatch mode
  timeRemaining: number; // For Tabata mode
  cycle: number;
  totalCycles: number;
  workDuration: number; // Configurable work duration
  restDuration: number; // Configurable rest duration
  soundToPlay?: "WORK" | "REST" | "COUNTDOWN";
}

class TabataTimer {
  // Function provided by server.ts to push updates to all clients
  private broadcastState: (data: Partial<UnifiedStateMessage>) => void;
  private interval: NodeJS.Timeout | null = null;
  private startTime: number | null = null;
  private runningTotal: number = 0; // Stored elapsed time when paused (in seconds)

  private state: DualModeTimerState = {
    mode: "TABATA", // Default mode
    isRunning: false,
    currentPhase: "IDLE",
    timeElapsed: 0,
    timeRemaining: 0,
    cycle: 0,
    totalCycles: DEFAULT_CYCLES,
    workDuration: DEFAULT_WORK_DURATION,
    restDuration: DEFAULT_REST_DURATION,
  };

  constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
    this.broadcastState = broadcastState;
    console.log("Dual-Mode Timer Service Initialized.");
  }

  // Adapt getState to return the expected TimerData structure for the front-end
  public getState(): TimerData {
    return {
      isRunning: this.state.isRunning,
      currentPhase: this.state.currentPhase,
      timeRemaining: this.state.timeRemaining,
      timeElapsed: this.state.timeElapsed,
      cycle: this.state.cycle,
      totalCycles: this.state.totalCycles,
      mode: this.state.mode,
      workDuration: this.state.workDuration,
      restDuration: this.state.restDuration,
      soundToPlay: this.state.soundToPlay,
    };
  }

  // --- Core Timer Logic ---

  private tick = () => {
    if (!this.state.isRunning || !this.startTime) return;

    if (
      this.state.mode === "STOPWATCH" &&
      this.state.currentPhase === "RUNNING"
    ) {
      // COUNT UP (STOPWATCH)
      const currentDelta = Math.floor((Date.now() - this.startTime) / 1000);
      this.state.timeElapsed = this.runningTotal + currentDelta;
    }

    // This applies to TABATA and PREPARE modes (which count down)
    if (this.state.mode === "TABATA" || this.state.currentPhase === "PREPARE") {
      this.state.timeRemaining -= 1;

      if (this.state.timeRemaining <= 0) {
        this.transitionPhase();
      }

      // Sound cues for countdown
      if (this.state.timeRemaining <= 3 && this.state.timeRemaining > 0) {
        this.state.soundToPlay = "COUNTDOWN";
      } else {
        this.state.soundToPlay = undefined;
      }
    }

    this.broadcastState({ timerData: this.getState() });
  };

  private startTimer() {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.startTime = Date.now();

    // --- UNIVERSAL PREPARE LOGIC ---
    // If starting from IDLE, always begin with the PREPARE countdown.
    if (this.state.currentPhase === "IDLE") {
      this.state.currentPhase = "PREPARE";
      this.state.timeRemaining = START_COUNTDOWN_DURATION;
      this.state.cycle = 0; // Pre-start
      console.log(
        `Starting universal PREPARE countdown for ${this.state.mode} mode.`
      );
    }
    // If resuming after PAUSE, restore previous state (no PREPARE)
    // Note: For Stopwatch, runningTotal is used to resume count up.

    this.interval = setInterval(this.tick, 1000);
    this.broadcastState({ timerData: this.getState() });
  }

  private pauseTimer() {
    if (!this.state.isRunning || !this.startTime) return;

    if (
      this.state.mode === "STOPWATCH" &&
      this.state.currentPhase === "RUNNING"
    ) {
      this.runningTotal = this.state.timeElapsed; // Save elapsed time
      this.state.currentPhase = "IDLE"; // Stopwatch sets to IDLE when paused
    }

    this.state.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.startTime = null;

    console.log("Timer paused.");
    this.broadcastState({ timerData: this.getState() });
  }

  private stopTimer() {
    if (this.interval) clearInterval(this.interval);

    // Full reset of all time and cycle variables
    this.state = {
      ...this.state,
      isRunning: false,
      currentPhase: "IDLE",
      timeElapsed: 0,
      timeRemaining: this.state.mode === "TABATA" ? this.state.workDuration : 0,
      cycle: 0,
    };
    this.runningTotal = 0;
    this.startTime = null;
    this.interval = null;

    console.log("Timer stopped and reset.");
    this.broadcastState({ timerData: this.getState() });
  }

  // --- Configuration ---
  public setConfig(config: {
    workDuration: number;
    restDuration: number;
    totalCycles?: number;
  }) {
    const sanitizedWork = Math.max(1, Math.floor(config.workDuration));
    const sanitizedRest = Math.max(0, Math.floor(config.restDuration));
    const sanitizedCycles = config.totalCycles
      ? Math.max(1, Math.floor(config.totalCycles))
      : this.state.totalCycles;

    this.state.workDuration = sanitizedWork;
    this.state.restDuration = sanitizedRest;
    this.state.totalCycles = sanitizedCycles;

    // If the timer is idle in Tabata mode, prime the next countdown length for clarity
    if (!this.state.isRunning && this.state.mode === "TABATA") {
      if (
        this.state.currentPhase === "WORK" ||
        this.state.currentPhase === "IDLE"
      ) {
        this.state.timeRemaining = sanitizedWork;
      } else if (this.state.currentPhase === "REST") {
        this.state.timeRemaining = sanitizedRest;
      }
    }

    console.log(
      `Timer configuration updated. Work: ${sanitizedWork}s, Rest: ${sanitizedRest}s, Cycles: ${sanitizedCycles}`
    );
    this.broadcastState({ timerData: this.getState() });
  }

  // --- Universal Transition Logic ---

  private transitionPhase() {
    this.state.soundToPlay = undefined; // Reset sound on phase transition

    switch (this.state.currentPhase) {
      case "PREPARE": // Transition from 5s countdown
        if (this.state.mode === "STOPWATCH") {
          // Start Stopwatch counting up
          this.state.currentPhase = "RUNNING";
          this.state.timeElapsed = 0;
          this.runningTotal = 0;
          this.startTime = Date.now(); // Reset start time for accurate count up
          console.log("Transition from PREPARE to STOPWATCH RUNNING.");
        } else {
          // Start Tabata Cycle 1 WORK
          this.state.cycle = 1;
          this.state.currentPhase = "WORK";
          this.state.timeRemaining = this.state.workDuration;
          this.state.soundToPlay = "WORK";
          console.log("Transition from PREPARE to TABATA WORK (Cycle 1).");
        }
        break;

      case "WORK":
        if (this.state.cycle < this.state.totalCycles) {
          this.state.currentPhase = "REST";
          this.state.timeRemaining = this.state.restDuration;
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
        this.state.timeRemaining = this.state.workDuration;
        this.state.soundToPlay = "WORK";
        console.log(`Transition to WORK for cycle ${this.state.cycle}`);
        break;

      case "IDLE":
      case "COOLDOWN":
      case "RUNNING":
        this.stopTimer();
        break;
    }
  }

  // --- Command Handler (Used by socketManager) ---
  public handleCommand(command: TimerCommand) {
    switch (command) {
      case "START":
        // START now triggers PREPARE if in IDLE
        this.startTimer();
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

  // --- Mode Switching ---
  public setMode(mode: TimerMode) {
    if (this.state.isRunning) this.stopTimer();
    this.state.mode = mode;
    this.state.currentPhase = "IDLE";
    this.state.timeRemaining = mode === "TABATA" ? this.state.workDuration : 0;
    this.state.timeElapsed = 0;
    this.state.cycle = 0;
    this.broadcastState({ timerData: this.getState() });
    console.log(`Mode set to ${mode}.`);
  }
}

export default TabataTimer;
