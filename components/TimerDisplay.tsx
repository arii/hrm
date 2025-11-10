// File: components/TimerDisplay.tsx
"use client";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { TimerMode, TimerPhase } from "../types/websocket";

export interface TimerDisplayProps {
  phase: TimerPhase;
  timeRemaining: number; // seconds (for countdown)
  timeElapsed: number; // seconds (for stopwatch)
  cycle: number;
  totalCycles: number;
  mode: TimerMode;
}

const pad = (n: number) => String(n).padStart(2, "0");

const TimerDisplay = ({
  phase,
  timeRemaining,
  timeElapsed,
  cycle,
  totalCycles,
  mode,
}: TimerDisplayProps) => {
  // Determine what to display based on mode and phase
  let displayTime: string;
  let phaseColor: string;
  let phaseLabel: string;

  if (phase === "PREPARE") {
    // PREPARE: Show countdown seconds only
    displayTime = String(timeRemaining).padStart(2, "0");
    phaseColor = "#F59E0B"; // Yellow/Warning
    phaseLabel = "GET READY";
  } else if (mode === "STOPWATCH" && phase === "RUNNING") {
    // STOPWATCH: Show elapsed time MM:SS
    const mm = Math.floor(timeElapsed / 60);
    const ss = timeElapsed % 60;
    displayTime = `${pad(mm)}:${pad(ss)}`;
    phaseColor = "#2563EB"; // Blue/Primary
    phaseLabel = "RUNNING";
  } else if (
    mode === "TABATA" &&
    (phase === "WORK" || phase === "REST" || phase === "COOLDOWN")
  ) {
    // TABATA: Show remaining time MM:SS
    const mm = Math.floor(timeRemaining / 60);
    const ss = timeRemaining % 60;
    displayTime = `${pad(mm)}:${pad(ss)}`;

    if (phase === "WORK") {
      phaseColor = "#EF4444"; // Red
      phaseLabel = "WORK";
    } else if (phase === "REST") {
      phaseColor = "#22C55E"; // Green
      phaseLabel = "REST";
    } else {
      phaseColor = "#3B82F6"; // Blue
      phaseLabel = "COOLDOWN";
    }
  } else {
    // IDLE or default
    displayTime = "00:00";
    phaseColor = "#6B7280"; // Gray
    phaseLabel = "READY";
  }

  return (
    <Card
      elevation={6}
      sx={{
        backgroundColor: "#000000", // Pure black for high energy
        color: phaseColor, // Dynamic color based on phase
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 2,
        border: "2px solid #1a1a1a", // Subtle border for definition
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 }, textAlign: "center" }}>
        {/* Phase Label */}
        {phase !== "IDLE" && (
          <Typography
            variant="h6"
            sx={{
              mb: 1,
              color: phaseColor,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {phaseLabel}
          </Typography>
        )}

        {/* Mode Indicator (small text) */}
        <Typography
          variant="caption"
          sx={{
            mb: 2,
            color: "#666",
            display: "block",
          }}
        >
          {mode === "STOPWATCH" ? "Stopwatch Mode" : "Tabata Mode"}
        </Typography>

        {/* Minimal phase indicator - visual dot */}
        {phase !== "IDLE" && (
          <Box sx={{ mb: 2 }}>
            <Box
              component="span"
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: phaseColor,
                animation: "pulse 2s ease-in-out infinite",
                display: "inline-block",
                boxShadow: `0 0 10px ${phaseColor}99`,
                "@media (prefers-reduced-motion)": {
                  animation: "none",
                },
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                },
              }}
              aria-hidden
            />
          </Box>
        )}

        {/* Giant Timer Display */}
        <Typography
          component="div"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            fontFamily: "var(--font-roboto-mono), monospace",
            fontSize: { xs: "6rem", sm: "8rem", md: "11rem" },
            fontWeight: 800,
            letterSpacing: "0.12rem",
            lineHeight: 1,
            color: phaseColor,
            textShadow: `0 0 20px ${phaseColor}80`,
          }}
        >
          {displayTime}
        </Typography>

        {/* Cycle Counter (Tabata only) */}
        {mode === "TABATA" && cycle > 0 && (
          <Typography
            variant="h5"
            sx={{
              mt: 2,
              color: "#666",
              fontWeight: 600,
            }}
          >
            Cycle {cycle} of {totalCycles}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default TimerDisplay;
