// File: components/TimerDisplay.tsx
"use client";
import { Box, Card, CardContent, Typography } from "@mui/material";

export interface TimerDisplayProps {
  phase: "WORK" | "REST" | "IDLE" | "COOLDOWN" | "PREPARE" | "RUNNING_CLOCK";
  timeRemaining: number; // seconds
  cycle: number;
  totalCycles: number | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

const TimerDisplay = ({
  phase,
  timeRemaining,
  cycle: _cycle,
  totalCycles: _totalCycles,
}: TimerDisplayProps) => {
  const mm = Math.floor(timeRemaining / 60);
  const ss = timeRemaining % 60;

  return (
    <Card
      elevation={6}
      sx={{
        backgroundColor: "#000000", // Pure black for high energy
        color: "#EF4444", // Bright red for digital clock feel
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
        {/* Minimal phase indicator - visual only (no text) */}
        {phase !== "IDLE" && (
          <Box sx={{ mb: 2 }}>
            <Box
              component="span"
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: phase === "WORK" ? "#EF4444" : "#22C55E", // Red for WORK, Green for REST
                animation: "pulse 2s ease-in-out infinite",
                display: "inline-block",
                boxShadow:
                  phase === "WORK"
                    ? "0 0 10px rgba(239, 68, 68, 0.6)"
                    : "0 0 10px rgba(34, 197, 94, 0.6)",
                "@media (prefers-reduced-motion)": {
                  animation: "none", // Disable animation if prefers-reduced-motion is set
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
            color: "#EF4444", // Bright red
            textShadow: "0 0 20px rgba(239, 68, 68, 0.5)", // Red glow effect
          }}
        >
          {pad(mm)}:{pad(ss)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default TimerDisplay;
