# Running Notes - HRM Development

Ephemeral scratchpad for **ACTIVE** work items only. Completed tasks are pruned. Durable guidance lives in `.github/copilot-instructions.md`, `README.md`, `UI_UX_IMPROVEMENTS.md`, and `DESIGN_SYSTEM_IMPLEMENTATION.md`.

**Current Focus**: Design System Implementation & UI Consistency  
**Status**: Phase 3 - UI Polish & Accessibility  
**Date**: November 9, 2025

1. control doesn't need to have tabata timer count down since this is shown on the main dashboard. Ideally it start/stop play pause etc ased on the actual system state and doesn't have to show full corls the whole time
2. spotify control is clunky and bloated it could look much nicer

3. Regression with client/connect

- doesn't show active heart rate and zone anymore
- doesn't stream heart rate to dashboard either
- has button to go to server but this stop streaming and should be removed for now

4. the spotify webplayer in the dashboard looks good! make sure to add volume controls
5. When heart rate is added to dashboard the google doc resizes to not be visible again /home/ari/.config/Code/User/workspaceStorage/vscode-chat-images/image-1762752815010.png

# Refactoring Workout Timer to support stopwatch (running clock) and tabata timer

The TabataTimer class is the central state machine for all timing in the application. It handles two modes and features a universal start countdown.

Key Operational Modes:
STOPWATCH: The service counts up (timeElapsed). The transitionPhase logic is simplified to only transition from PREPARE to RUNNING.

TABATA: The service counts down (timeRemaining). It manages full workout cycles (Work, Rest, Cooldown) and advances the cycle count.

Universal Start Flow:
Regardless of the mode, the process for starting is now standardized:

START command received.

State changes from IDLE to PREPARE (5-second countdown).

When PREPARE hits zero, the service transitions to either RUNNING (Stopwatch mode) or WORK (Tabata mode).

This file is robust because it encapsulates all complex timing logic on the server, sending only a simple, unified TimerData object to the client.

```
// File: services/tabataTimer.ts (Dual-Mode Timer Service: Stopwatch & Tabata with Universal PREPARE)
/**
 * Dual-Mode Timer Service: Manages both continuous elapsed time (Stopwatch)
 * and interval-based countdowns (Tabata). Now includes a universal 5-second
 * PREPARE countdown that runs before both the Stopwatch and Tabata modes begin.
 * Pushes updates to the WebSocket manager via the injected broadcast function.
 */
import { TimerData, UnifiedStateMessage } from '../types/websocket';

// --- Tabata Constants ---
const DEFAULT_CYCLES = 8;
const WORK_DURATION = 30; // seconds
const REST_DURATION = 10; // seconds
const COOLDOWN_DURATION = 5; // seconds
const START_COUNTDOWN_DURATION = 5; // seconds (5-second countdown before WORK or RUNNING)

type TimerMode = 'STOPWATCH' | 'TABATA';
type Phase = 'WORK' | 'REST' | 'IDLE' | 'COOLDOWN' | 'RUNNING' | 'PREPARE'; // ADDED PREPARE

type TimerCommand = 'START' | 'PAUSE' | 'STOP' | 'SET_TABATA' | 'SET_STOPWATCH';

// Internal state structure
interface DualModeTimerState extends Omit<TimerData, 'timeRemaining' | 'currentPhase'> {
    mode: TimerMode;
    currentPhase: Phase;
    timeElapsed: number; // For Stopwatch mode
    timeRemaining: number; // For Tabata mode
    cycle: number;
    totalCycles: number;
}

export class TabataTimer {
    private broadcastState: (data: Partial<UnifiedStateMessage>) => void;
    private interval: NodeJS.Timeout | null = null;
    private startTime: number | null = null;
    private runningTotal: number = 0; // Stored elapsed time when paused (in seconds)

    private state: DualModeTimerState = {
        mode: 'STOPWATCH', // Default mode
        isRunning: false,
        currentPhase: 'IDLE',
        timeElapsed: 0,
        timeRemaining: 0,
        cycle: 0,
        totalCycles: DEFAULT_CYCLES,
    };

    constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
        this.broadcastState = broadcastState;
        console.log('Dual-Mode Timer Service Initialized.');
    }

    // Adapt getState to return the expected TimerData structure for the front-end
    public getState(): TimerData {
        // Determine the time value based on the current mode/phase
        let timeValue;
        if (this.state.mode === 'STOPWATCH' && this.state.currentPhase === 'RUNNING') {
            timeValue = this.state.timeElapsed;
        } else if (this.state.mode === 'TABATA' || this.state.currentPhase === 'PREPARE') {
            timeValue = this.state.timeRemaining;
        } else {
            timeValue = 0; // IDLE or PAUSED stopwatch resets to 0 display
        }

        return {
            isRunning: this.state.isRunning,
            // Only expose standard phases to client. PREPARE/RUNNING are internal.
            currentPhase: this.state.currentPhase === 'RUNNING' || this.state.currentPhase === 'PREPARE' ? 'IDLE' : this.state.currentPhase as ('WORK' | 'REST' | 'IDLE' | 'COOLDOWN'),
            timeRemaining: timeValue,
            cycle: this.state.cycle,
            totalCycles: this.state.totalCycles,
        };
    }

    // --- Core Timer Logic ---

    private tick = () => {
        if (!this.state.isRunning || !this.startTime) return;

        if (this.state.mode === 'STOPWATCH' && this.state.currentPhase === 'RUNNING') {
            // COUNT UP (STOPWATCH)
            const currentDelta = Math.floor((Date.now() - this.startTime) / 1000);
            this.state.timeElapsed = this.runningTotal + currentDelta;
        }

        // This applies to TABATA and PREPARE modes (which count down)
        if (this.state.mode === 'TABATA' || this.state.currentPhase === 'PREPARE') {
            this.state.timeRemaining -= 1;

            if (this.state.timeRemaining <= 0) {
                this.transitionPhase();
            }
        }

        this.broadcastState({ timerData: this.getState() });
    }

    private startTimer() {
        if (this.state.isRunning) return;

        this.state.isRunning = true;
        this.startTime = Date.now();

        // --- UNIVERSAL PREPARE LOGIC ---
        // If starting from IDLE, always begin with the PREPARE countdown.
        if (this.state.currentPhase === 'IDLE') {
            this.state.currentPhase = 'PREPARE';
            this.state.timeRemaining = START_COUNTDOWN_DURATION;
            this.state.cycle = 0; // Pre-start
            console.log(`Starting universal PREPARE countdown for ${this.state.mode} mode.`);
        }
        // If resuming after PAUSE, restore previous state (no PREPARE)
        // Note: For Stopwatch, runningTotal is used to resume count up.

        this.interval = setInterval(this.tick, 1000);
        this.broadcastState({ timerData: this.getState() });
    }

    private pauseTimer() {
        if (!this.state.isRunning || !this.startTime) return;

        if (this.state.mode === 'STOPWATCH' && this.state.currentPhase === 'RUNNING') {
            this.runningTotal = this.state.timeElapsed; // Save elapsed time
            this.state.currentPhase = 'IDLE'; // Stop watch sets to IDLE when paused
        }

        this.state.isRunning = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        this.startTime = null;

        console.log(`Timer paused.`);
        this.broadcastState({ timerData: this.getState() });
    }

    private stopTimer() {
        if (this.interval) clearInterval(this.interval);

        // Full reset of all time and cycle variables
        this.state = {
            ...this.state,
            isRunning: false,
            currentPhase: 'IDLE',
            timeElapsed: 0,
            timeRemaining: 0,
            cycle: 0,
        };
        this.runningTotal = 0;
        this.startTime = null;
        this.interval = null;

        console.log('Timer stopped and reset.');
        this.broadcastState({ timerData: this.getState() });
    }

    // --- Universal Transition Logic ---

    private transitionPhase() {
        switch (this.state.currentPhase) {
            case 'PREPARE': // Transition from 5s countdown
                if (this.state.mode === 'STOPWATCH') {
                    // Start Stopwatch counting up
                    this.state.currentPhase = 'RUNNING';
                    this.state.timeElapsed = 0;
                    this.runningTotal = 0;
                    this.startTime = Date.now(); // Reset start time for accurate count up
                    console.log('Transition from PREPARE to STOPWATCH RUNNING.');
                } else {
                    // Start Tabata Cycle 1 WORK
                    this.state.cycle = 1;
                    this.state.currentPhase = 'WORK';
                    this.state.timeRemaining = WORK_DURATION;
                    console.log('Transition from PREPARE to TABATA WORK (Cycle 1).');
                }
                break;

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
                // START now triggers PREPARE if in IDLE
                this.startTimer();
                break;
            case 'PAUSE':
                this.pauseTimer();
                break;
            case 'STOP':
                this.stopTimer();
                break;
            // --- Mode Switching Commands ---
            case 'SET_TABATA':
                if (this.state.isRunning) this.stopTimer();
                this.state.mode = 'TABATA';
                this.state.currentPhase = 'IDLE';
                this.state.timeRemaining = 0; // Display 0 until START is pressed
                this.state.timeElapsed = 0;
                this.state.cycle = 0;
                this.broadcastState({ timerData: this.getState() });
                console.log('Mode set to TABATA.');
                break;
            case 'SET_STOPWATCH':
                if (this.state.isRunning) this.stopTimer();
                this.state.mode = 'STOPWATCH';
                this.state.currentPhase = 'IDLE';
                this.state.timeRemaining = 0;
                this.state.timeElapsed = 0;
                this.state.cycle = 0;
                this.broadcastState({ timerData: this.getState() });
                console.log('Mode set to STOPWATCH.');
                break;
            default:
                console.warn(`Unknown timer command: ${command}`);
        }
    }
}

export default TabataTimer;
```

Since the server is sending the elapsed time in seconds (via the timeRemaining field), we need a utility function to format that number into a human-readable clock string.

Here are the required updates for your main display and your control panel:

1. Updated app/page.tsx (Main Viewer Dashboard)
   I've added a formatTime utility function and updated the Timer card to display the elapsed time correctly instead of just the remaining seconds. I also removed the interval-specific constants.

1. Updated app/client/control/page.tsx (Control Panel)
   I've applied the same formatTime utility here for consistency and removed the non-existent cycle display.

These updates fully integrate the simplified stopwatch logic into your frontend UI, ensuring both your control panel and your main dashboard display the elapsed time accurately.

```
// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main application dashboard component using MUI for visualization.
 * It consumes all real-time state from the useWebSocket hook.
 */
"use client";
import React, { useMemo } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import useBluetoothHRM from '../hooks/useBluetoothHRM';
import GoogleDocViewer from '../components/GoogleDocViewer';
import { getHrZoneProps, getTimerProps } from '../utils/visualization';
import { TimerCommandMessage, SpotifyCommandMessage } from '../types/websocket';

import {
  Container, Box, Typography, Button, Card, CardContent, Grid,
  CircularProgress, LinearProgress, IconButton, Stack
}
//... [rest of imports]

// Utility to format seconds into MM:SS
const formatTime = (totalSeconds: number): string => {
    if (totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
};

const MainDashboard: React.FC = () => {
  const { connectionStatus, hrmData, spotifyData, timerData, sendData } = useWebSocket();
  const { isConnected: isBluetoothConnected, MAX_HR } = useBluetoothHRM();

  const hrZoneProps = useMemo(() => getHrZoneProps(hrmData.value, hrmData.maxHr || MAX_HR), [hrmData, MAX_HR]);

  // Use 'RUNNING' and 'IDLE' phases now that Tabata logic is removed
  const timerProps = getTimerProps(timerData.currentPhase);

  // The service now sends timeElapsed in the timeRemaining field
  const timeElapsed = timerData.timeRemaining;
  const formattedTime = formatTime(timeElapsed);

  // Since this is a stopwatch, progress bar is always 100% when running, or 0% when idle.
  const progressValue = timerData.isRunning ? 100 : 0;

  // Note: Controls are sent from the separate /client/control page, but added here for quick testing/visibility
  const sendControlCommand = (type: 'TIMER' | 'SPOTIFY', command: string) => {
    if (type === 'TIMER') {
        const msg: TimerCommandMessage = { type: 'TIMER_COMMAND', command: command as ('START' | 'PAUSE' | 'STOP') };
        sendData(msg);
    } else if (type === 'SPOTIFY') {
        const msg: SpotifyCommandMessage = { type: 'SPOTIFY_COMMAND', command: command as ('PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS') };
        sendData(msg);
    }
  };

  return (
    <Container maxWidth="lg" className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      {/* ... [rest of status and HRM components] ... */}

        {/* --- LEFT COLUMN: HRM and TIMER --- */}
        <Grid item xs={12} md={6} lg={4}>

            {/* 1. REAL-TIME HRM DISPLAY */}
            <Card id="hrm-card" raised className="mb-6 rounded-xl shadow-lg border-t-4 border-red-500">
            {/* ... [HRM content remains unchanged] ... */}
            </Card>

            {/* 2. SIMPLE STOPWATCH TIMER */}
            <Card id="timer-card" raised className={`mb-6 rounded-xl shadow-lg border-t-4 border-yellow-600`} style={{ backgroundColor: timerProps.backgroundColor }}>
                <CardContent className="text-center">
                    <Typography variant="h5" className="font-bold text-gray-800 mb-4 flex items-center justify-center">
                        <Timer className="mr-2" /> Stopwatch
                    </Typography>

                    <Box className="relative inline-flex mb-4">
                        <CircularProgress
                            variant="determinate"
                            value={progressValue}
                            size={120}
                            thickness={5}
                            color={timerData.isRunning ? 'primary' : 'inherit'} // Use primary color when running
                            className="transition-colors duration-500"
                        />
                        <Box
                            top={0} left={0} bottom={0} right={0} position="absolute"
                            display="flex" alignItems="center" justifyContent="center" flexDirection="column"
                        >
                            <Typography variant="h3" component="div" className="font-extrabold" color="text.primary">
                                {formattedTime} {/* <-- UPDATED to show MM:SS */}
                            </Typography>
                            <Typography id="timer-phase" variant="caption" component="div" className="font-semibold text-sm" color="text.secondary">
                                {timerData.isRunning ? 'Running' : timerProps.text} {/* Display RUNNING/IDLE */}
                            </Typography>
                        </Box>
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                        Total Time Elapsed
                    </Typography>
                </CardContent>
            </Card>
        </Grid>

        {/* ... [rest of grid and components] ... */}
      </Grid>
    </Container>
  );
}

export default MainDashboard;
```

# Refactoring front end to visualize tabata and stopwatch timer:

This is the most crucial update, as the frontend needs to react dynamically to the new mode (STOPWATCH vs. TABATA) and the PREPARE phase.

I will make the following changes across the three main frontend files:

hooks/useWebSocket.ts: Update the TimerData initial state to include the two new mode commands (SET_TABATA, SET_STOPWATCH).

app/page.tsx (Dashboard): Update the display to show the correct time format (MM:SS or SS) and status (PREPARE, WORK, REST, or RUNNING) based on the active mode.

app/client/control/page.tsx (Control Panel): Add buttons for SET MODE to allow the user to switch between Stopwatch and Tabata, and update the display to reflect the current mode.

1. Updated hooks/useWebSocket.ts (Typed Commands)
   I'll update the shared types to include the mode setting commands.

2. Updated app/page.tsx (Dashboard Display Logic)
   This file will now check the timer's internal state (timerData.timeRemaining, timerData.currentPhase) and the assumed mode to decide what to display.

3. Updated app/client/control/page.tsx (Control Panel and Mode Switching)
   This is the most critical change: adding the mode selection buttons and logic to send the new SET_MODE commands to the server.

These changes ensure your frontend fully supports the new Dual-Mode Timer, allowing users to switch between the original Tabata countdown and the Stopwatch elapsed time, all while respecting the new 5-second universal preparation countdown.

```
// File: app/page.tsx (Main Viewer Dashboard - Aggregated Viewer)
/**
 * Main Viewer Dashboard: Aggregates and visualizes real-time data from
 * all server services (HRM, Timer, Spotify) using data fetched by useWebSocket.
 */
'use client';
import React, { useMemo } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, CircularProgress, LinearProgress, useTheme } from '@mui/material';
import { AccessTime, FitnessCenter, MusicNote, Favorite } from '@mui/icons-material';
import useWebSocket from '../hooks/useWebSocket';
import GoogleDocViewer from '../components/GoogleDocViewer';
import { getHrZoneProps, getPhaseProps } from '../utils/visualization';
import Link from 'next/link';

// URL for the embedded workout document
const WORKOUT_DOC_URL = "https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true";

// Utility function to format total seconds into MM:SS
const formatTime = (totalSeconds: number) => {
    // Ensure the time doesn't go negative during the last second of countdown
    const safeSeconds = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const Dashboard: React.FC = () => {
    const theme = useTheme();
    const { hrmData, timerData, spotifyData, connectionStatus } = useWebSocket();

    // --- Visualization Logic ---
    const hrProps = useMemo(() => getHrZoneProps(hrmData.value, hrmData.maxHr), [hrmData]);
    const phaseProps = useMemo(() => getPhaseProps(timerData.currentPhase), [timerData.currentPhase]);

    // Determine the main timer display
    const timerDisplay = useMemo(() => {
        // PREPARE phase displays countdown in seconds (SS)
        if (timerData.currentPhase === 'PREPARE') {
            return {
                time: timerData.timeRemaining > 9 ? String(timerData.timeRemaining) : `0${timerData.timeRemaining}`,
                fontSize: 'h1',
                label: "GET READY",
                color: phaseProps.color,
            };
        }

        // WORK, REST, or COOLDOWN displays MM:SS countdown
        if (timerData.currentPhase === 'WORK' || timerData.currentPhase === 'REST' || timerData.currentPhase === 'COOLDOWN') {
            return {
                time: formatTime(timerData.timeRemaining),
                fontSize: 'h2',
                label: timerData.currentPhase,
                color: phaseProps.color,
            };
        }

        // RUNNING or IDLE/STOPWATCH mode displays elapsed time (MM:SS)
        return {
            // Note: In STOPWATCH mode, the server sends elapsed time via timeRemaining field
            time: formatTime(timerData.timeRemaining),
            fontSize: 'h2',
            label: timerData.currentPhase === 'RUNNING' ? 'STOPWATCH' : 'IDLE',
            color: 'text.secondary',
        };
    }, [timerData, phaseProps.color]);


    // Determine the phase background color
    const phaseBackgroundColor = phaseProps.backgroundColor;
    const isRunningOrPrepare = timerData.currentPhase !== 'IDLE' && timerData.currentPhase !== 'COOLDOWN';

    // Timer Progress (Calculates progress based on the mode and duration)
    const timerProgress = useMemo(() => {
        if (!isRunningOrPrepare) return 0; // Not running, no progress bar

        let duration = 0;
        let elapsed = 0;

        if (timerData.currentPhase === 'PREPARE') {
             // PREPARE is 5s countdown
            duration = 5;
            elapsed = 5 - timerData.timeRemaining;
        } else if (timerData.currentPhase === 'WORK') {
            // Assuming 30s work for display progress
            duration = 30;
            elapsed = 30 - timerData.timeRemaining;
        } else if (timerData.currentPhase === 'REST') {
            // Assuming 10s rest for display progress
            duration = 10;
            elapsed = 10 - timerData.timeRemaining;
        } else {
             // For STOPWATCH/RUNNING mode, just show constant full bar or hide it
            return 100;
        }

        return Math.min(100, (elapsed / duration) * 100);

    }, [timerData.currentPhase, timerData.timeRemaining, isRunningOrPrepare]);

    // --- Rendering ---

    return (
        <Container maxWidth="xl" className="py-8 min-h-screen bg-gray-50">
            <Typography variant="h4" component="h1" gutterBottom className="font-bold text-gray-800">
                Live Workout Dashboard
            </Typography>

            <Grid container spacing={3}>

                {/* 1. Heart Rate Monitor (HRM) Status */}
                <Grid item xs={12} md={4}>
                    <Card className="shadow-lg h-full flex flex-col transition-all duration-300" style={{ backgroundColor: hrProps.backgroundColor }}>
                        <CardContent className="flex-grow text-center text-white">
                            <Favorite sx={{ fontSize: 40 }} className="mb-2" />
                            <Typography variant="h6" id="hr-zone-title" className="font-semibold" style={{ color: hrProps.color }}>
                                {hrProps.zone}
                            </Typography>
                            <Typography variant="h1" component="div" className="font-extrabold my-4" style={{ fontSize: '6rem' }}>
                                {hrmData.value}
                            </Typography>
                            <Typography variant="h4" component="div">
                                BPM
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={hrProps.percentage}
                                sx={{ height: 10, borderRadius: 5, mt: 3, '& .MuiLinearProgress-bar': { backgroundColor: hrProps.color } }}
                            />
                            <Typography variant="caption" display="block" className="mt-2" style={{ color: hrProps.color }}>
                                Current HR: {hrProps.percentage}% of Max ({hrmData.maxHr} BPM)
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 2. Tabata/Stopwatch Timer Status */}
                <Grid item xs={12} md={4}>
                    <Card className="shadow-lg h-full flex flex-col transition-all duration-300" sx={{ backgroundColor: phaseBackgroundColor }}>
                        <CardContent className="flex-grow text-center text-white p-4">
                            <AccessTime sx={{ fontSize: 40 }} className="mb-2" />

                            {/* Phase Display */}
                            <Typography variant="h4" component="div" id="timer-phase" className="font-semibold mb-2" style={{ color: phaseProps.color }}>
                                {timerDisplay.label}
                            </Typography>

                            {/* Time Display */}
                            <Typography
                                variant={timerDisplay.fontSize as 'h1' | 'h2'}
                                component="div"
                                className="font-extrabold my-4"
                                style={{ fontSize: '7rem', color: theme.palette.common.white }}
                            >
                                {timerDisplay.time}
                            </Typography>

                            {/* Cycle Counter / Status */}
                            {timerData.currentPhase !== 'RUNNING' && timerData.currentPhase !== 'IDLE' && (
                                <Typography variant="h6" className="mt-4" style={{ color: theme.palette.common.white }}>
                                    {timerData.cycle > 0 ? `Cycle ${timerData.cycle} of ${timerData.totalCycles}` : 'STOPPED'}
                                </Typography>
                            )}

                            {/* Mode Hint */}
                            <Typography variant="body2" className="mt-4 text-white/80">
                                Current Mode: {timerData.mode || 'TABATA'}
                            </Typography>

                            {/* Progress Bar for Intervals */}
                            {isRunningOrPrepare && (
                                <LinearProgress
                                    variant="determinate"
                                    value={timerProgress}
                                    sx={{ height: 10, borderRadius: 5, mt: 3, backgroundColor: 'rgba(255, 255, 255, 0.3)', '& .MuiLinearProgress-bar': { backgroundColor: theme.palette.common.white } }}
                                />
                            )}

                            {/* Connection Status */}
                            <Typography variant="caption" className="mt-2 text-white/70">
                                Server: {connectionStatus}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 3. Spotify Control/Status */}
                <Grid item xs={12} md={4}>
                    <Card className="shadow-lg h-full flex flex-col p-4 bg-gray-900 text-white">
                        <CardContent className="flex-grow text-center">
                            <MusicNote sx={{ fontSize: 40, color: '#1DB954' }} className="mb-2" />
                            <Typography variant="h6" component="h3" className="font-semibold text-green-400 mb-4">
                                Spotify Playback
                            </Typography>
                            <Typography variant="subtitle1" className="font-medium text-gray-300">
                                Now Playing:
                            </Typography>
                            <Typography variant="h5" component="div" className="font-bold mb-1 text-white">
                                {spotifyData.trackName}
                            </Typography>
                            <Typography variant="body1" className="text-gray-400">
                                {spotifyData.artist}
                            </Typography>

                            <Box className="mt-8">
                                <Link href="/client/control" passHref>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        sx={{
                                            backgroundColor: '#1DB954',
                                            '&:hover': { backgroundColor: '#169944' }
                                        }}
                                        startIcon={<FitnessCenter />}
                                    >
                                        Open Workout Controls
                                    </Button>
                                </Link>
                            </Box>

                        </CardContent>
                    </Card>
                </Grid>

                {/* 4. Workout Document Viewer */}
                <Grid item xs={12}>
                    <GoogleDocViewer
                        title="Today's Training Regimen"
                        embedUrl={WORKOUT_DOC_URL}
                        height={550}
                    />
                </Grid>

            </Grid>
        </Container>
    );
};

export default Dashboard;
```

Control Panel (app/client/control/page.tsx). This version includes all the necessary logic for mode switching (SET_TABATA, SET_STOPWATCH) and updated display handling for your dual-mode timer.

```
// File: app/client/control/page.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel: Provides a mobile-friendly UI to control the timer,
 * Spotify playback, and switch between Tabata and Stopwatch modes.
 */
'use client';
import React from 'react';
import { Container, Card, CardContent, Typography, Button, Box, IconButton, useTheme } from '@mui/material';
import {
    PlayArrow,
    Pause,
    Stop,
    SkipNext,
    SkipPrevious,
    Timer,
    MusicNote,
    Watch,
    FitnessCenter
} from '@mui/icons-material';
import useWebSocket from '../../../hooks/useWebSocket';
import { TimerCommandMessage, SpotifyCommandMessage, TimerModeCommandMessage } from '../../../types/websocket';

// Utility function to format total seconds into MM:SS
const formatTime = (totalSeconds: number) => {
    const safeSeconds = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const ControlPanel: React.FC = () => {
    const theme = useTheme();
    const { timerData, spotifyData, sendData, connectionStatus } = useWebSocket();

    const isRunning = timerData.isRunning;
    const currentPhase = timerData.currentPhase;
    const currentMode = timerData.mode || 'TABATA'; // Default to TABATA if not set

    // --- Command Senders ---

    const sendTimerCommand = (command: 'START' | 'PAUSE' | 'STOP') => {
        const message: TimerCommandMessage = {
            type: 'TIMER_COMMAND',
            command: command,
        };
        sendData(message);
    };

    const sendSpotifyCommand = (command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS') => {
        // Use PLAY/PAUSE toggle logic
        if (command === 'PLAY' && spotifyData.isPlaying) {
            command = 'PAUSE';
        } else if (command === 'PAUSE' && !spotifyData.isPlaying) {
            command = 'PLAY';
        }

        const message: SpotifyCommandMessage = {
            type: 'SPOTIFY_COMMAND',
            command: command,
        };
        sendData(message);
    };

    const sendModeCommand = (mode: 'TABATA' | 'STOPWATCH') => {
        const message: TimerModeCommandMessage = {
            type: 'SET_MODE',
            mode: mode,
        };
        sendData(message);
        // Also send a STOP to reset the timer when switching modes
        sendTimerCommand('STOP');
    };

    // --- UI Display Logic ---

    // Determine the main timer display based on phase and mode
    const timerDisplay = React.useMemo(() => {
        if (currentPhase === 'PREPARE') {
            return `0${timerData.timeRemaining}`; // "05"
        }
        // In TABATA mode, show countdown
        if (currentMode === 'TABATA') {
            return formatTime(timerData.timeRemaining); // "00:30"
        }
        // In STOPWATCH mode, show elapsed time (which server sends via timeElapsed)
        return formatTime(timerData.timeElapsed); // "01:15"

    }, [currentMode, currentPhase, timerData.timeRemaining, timerData.timeElapsed]);

    // Determine the status label
    const statusLabel = React.useMemo(() => {
        if (currentPhase === 'PREPARE') return 'GET READY';
        if (currentMode === 'STOPWATCH') {
            return isRunning ? 'RUNNING' : 'STOPWATCH';
        }
        // Tabata mode
        return currentPhase; // 'IDLE', 'WORK', 'REST', 'COOLDOWN'
    }, [currentMode, currentPhase, isRunning]);


    return (
        <Container maxWidth="sm" className="py-8 min-h-screen bg-gray-100">
            <Typography variant="h4" component="h1" gutterBottom className="font-bold text-gray-800 text-center">
                Workout Controls
            </Typography>

            {/* --- Timer Control Card --- */}
            <Card className="shadow-lg mb-6">
                <CardContent className="text-center p-6">
                    <Timer color="primary" sx={{ fontSize: 50, mb: 2 }} />
                    <Typography variant="h6" className="font-semibold text-gray-700">
                        Current Mode: {currentMode}
                    </Typography>

                    {/* Timer Display */}
                    <Typography variant="h1" component="div" className="font-extrabold my-4 text-gray-900" style={{ fontSize: '5rem' }}>
                        {timerDisplay}
                    </Typography>

                    {/* Status Display */}
                    <Typography variant="h5" component="div" className="font-semibold mb-6" color="primary">
                        {statusLabel}
                    </Typography>

                    {/* Main Timer Controls */}
                    <Box className="flex justify-center gap-4 mb-6">
                        <IconButton
                            aria-label="Start Timer"
                            onClick={() => sendTimerCommand('START')}
                            disabled={isRunning || currentPhase === 'PREPARE'}
                            sx={{
                                backgroundColor: theme.palette.success.main,
                                color: 'white',
                                '&:hover': { backgroundColor: theme.palette.success.dark },
                                '&:disabled': { backgroundColor: 'grey.300' }
                            }}
                            size="large"
                        >
                            <PlayArrow fontSize="large" />
                        </IconButton>
                        <IconButton
                            aria-label="Pause Timer"
                            onClick={() => sendTimerCommand('PAUSE')}
                            disabled={!isRunning}
                            sx={{
                                backgroundColor: theme.palette.warning.main,
                                color: 'white',
                                '&:hover': { backgroundColor: theme.palette.warning.dark },
                                '&:disabled': { backgroundColor: 'grey.300' }
                            }}
                            size="large"
                        >
                            <Pause fontSize="large" />
                        </IconButton>
                        <IconButton
                            aria-label="Stop Timer"
                            onClick={() => sendTimerCommand('STOP')}
                            sx={{
                                backgroundColor: theme.palette.error.main,
                                color: 'white',
                                '&:hover': { backgroundColor: theme.palette.error.dark }
                            }}
                            size="large"
                        >
                            <Stop fontSize="large" />
                        </IconButton>
                    </Box>

                    {/* Mode Switching Controls */}
                    <Box className="flex justify-center gap-4">
                        <Button
                            variant={currentMode === 'TABATA' ? 'contained' : 'outlined'}
                            onClick={() => sendModeCommand('TABATA')}
                            startIcon={<FitnessCenter />}
                            disabled={isRunning}
                        >
                            Tabata Mode
                        </Button>
                        <Button
                            variant={currentMode === 'STOPWATCH' ? 'contained' : 'outlined'}
                            onClick={() => sendModeCommand('STOPWATCH')}
                            startIcon={<Watch />}
                            disabled={isRunning}
                        >
                            Stopwatch Mode
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* --- Spotify Control Card --- */}
            <Card className="shadow-lg">
                <CardContent className="text-center p-6">
                    <MusicNote color="secondary" sx={{ fontSize: 50, mb: 2 }} />
                    <Typography variant="h6" className="font-semibold text-gray-700 mb-2">
                        Spotify Controls
                    </Typography>
                    <Typography variant="body1" className="text-gray-600 mb-1">
                        {spotifyData.trackName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" className="mb-6">
                        {spotifyData.artist}
                    </Typography>

                    <Box className="flex justify-center gap-4">
                        <IconButton
                            aria-label="Previous Track"
                            onClick={() => sendSpotifyCommand('PREVIOUS')}
                            color="primary"
                            size="large"
                        >
                            <SkipPrevious fontSize="large" />
                        </IconButton>
                        <IconButton
                            aria-label={spotifyData.isPlaying ? "Pause" : "Play"}
                            onClick={() => sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')}
                            color="primary"
                            size="large"
                            sx={{
                                backgroundColor: theme.palette.primary.main,
                                color: 'white',
                                '&:hover': { backgroundColor: theme.palette.primary.dark }
                            }}
                        >
                            {spotifyData.isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                        </IconButton>
                        <IconButton
                            aria-label="Next Track"
                            onClick={() => sendSpotifyCommand('NEXT')}
                            color="primary"
                            size="large"
                        >
                            <SkipNext fontSize="large" />
                        </IconButton>
                    </Box>
                </CardContent>
            </Card>

            {/* Connection Status Footer */}
            <Typography variant="caption" display="block" className="text-center mt-4">
                Server Status: {connectionStatus}
            </Typography>
        </Container>
    );
};

export default ControlPanel;


```

Updates to types

```
// File: types/websocket.ts
/**
 * Description: Defines the shared data contract (interfaces and types)
 * used for all communication between the server and clients over WebSocket.
 */

// --- Data Payloads (Server -> Client) ---

export interface HrmData {
    value: number;
    maxHr: number;
}

export type TimerPhase = 'IDLE' | 'PREPARE' | 'WORK' | 'REST' | 'COOLDOWN' | 'RUNNING';
export type TimerMode = 'TABATA' | 'STOPWATCH';

export interface TimerData {
    isRunning: boolean;
    currentPhase: TimerPhase;
    timeRemaining: number; // Used for countdowns (Tabata, Prepare)
    timeElapsed: number;   // Used for count-ups (Stopwatch)
    cycle: number;
    totalCycles: number;
    mode: TimerMode;
}

export interface SpotifyData {
    trackName: string;
    artist: string;
    isPlaying: boolean;
}

/**
 * The unified state message broadcast by the server.
 * All properties are optional, allowing services to send partial updates.
 */
export interface UnifiedStateMessage {
    type: 'STATE_UPDATE';
    hrmData?: HrmData;
    timerData?: TimerData;
    spotifyData?: SpotifyData;
}


// --- Command Payloads (Client -> Server) ---

export interface HrmInputMessage {
    type: 'HRM_INPUT';
    data: HrmData;
}

export interface TimerCommandMessage {
    type: 'TIMER_COMMAND';
    command: 'START' | 'PAUSE' | 'STOP';
}

export interface TimerModeCommandMessage {
    type: 'SET_MODE';
    mode: TimerMode;
}

export interface SpotifyCommandMessage {
    type: 'SPOTIFY_COMMAND';
    command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'LOGIN'; // LOGIN might be used by a client-side SDK
}

// A union type representing all possible messages a client can send
export type ClientCommandMessage =
    | HrmInputMessage
    | TimerCommandMessage
    | TimerModeCommandMessage
    | SpotifyCommandMessage;

```
