// File: components/TimerDisplay.tsx
"use client";
import { Card, CardContent, Typography } from "@mui/material";

export interface TimerDisplayProps {
  phase: "WORK" | "REST" | "IDLE" | "COOLDOWN" | "PREPARE"; // Added PREPARE phase
  timeRemaining: number; // seconds
  cycle: number;
  totalCycles: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

const TimerDisplay = ({
  phase,
  timeRemaining,
  cycle,
  totalCycles,
}: TimerDisplayProps) => {
  const mm = Math.floor(timeRemaining / 60);
  const ss = timeRemaining % 60;
  return (
    <Card
      sx={{
        backgroundColor: "black",
        color: "red",
        height: "100%", // Make it fill the grid item
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CardContent sx={{ p: 3, textAlign: "center" }}>
        {/* Phase indicator - only show if not IDLE */}
        {phase !== "IDLE" && (
          <Typography variant="body2" sx={{ color: "#fff", mb: 2 }}>
            {phase} • Cycle {cycle}/{totalCycles}
          </Typography>
        )}
        <Typography
          variant="h1"
          sx={{
            fontFamily: "monospace",
            fontSize: { xs: "5rem", sm: "7rem", md: "9rem" },
            fontWeight: "bold",
            letterSpacing: "0.4rem",
            lineHeight: 1,
            color: "red",
          }}
        >
          {pad(mm)}:{pad(ss)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default TimerDisplay;
