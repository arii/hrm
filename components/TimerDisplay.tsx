// File: components/TimerDisplay.tsx
"use client";
import { Paper, Typography } from "@mui/material";
import React from "react";

export interface TimerDisplayProps {
  phase: "WORK" | "REST" | "IDLE" | "COOLDOWN";
  timeRemaining: number; // seconds
  cycle: number;
  totalCycles: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  phase,
  timeRemaining,
  cycle,
  totalCycles,
}) => {
  const mm = Math.floor(timeRemaining / 60);
  const ss = timeRemaining % 60;
  return (
    <Paper
      sx={{
        backgroundColor: "#000",
        color: "#ff0000",
        p: 3,
        textAlign: "center",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Typography variant="caption" sx={{ color: "#999", mb: 1 }}>
        {phase} • Cycle {cycle}/{totalCycles}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
          fontSize: { xs: "3.5rem", sm: "5rem" },
          fontWeight: "bold",
          letterSpacing: "0.4rem",
          lineHeight: 1,
        }}
      >
        {pad(mm)}:{pad(ss)}
      </Typography>
    </Paper>
  );
};

export default TimerDisplay;
