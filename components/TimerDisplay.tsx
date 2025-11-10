// File: components/TimerDisplay.tsx
"use client";
import { Box, Card, CardContent, Typography } from "@mui/material";

export interface TimerDisplayProps {
  phase: "WORK" | "REST" | "IDLE" | "COOLDOWN" | "PREPARE";
  timeRemaining: number; // seconds
  cycle: number;
  totalCycles: number;
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
      sx={{
        backgroundColor: "primary.main",
        color: "common.white",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: 3,
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ p: 2, textAlign: "center" }}>
        {/* Minimal phase indicator - visual only (no text) */}
        {phase !== "IDLE" && (
          <Box sx={{ mb: 1 }}>
            <Box
              component="span"
              sx={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor:
                  phase === "WORK" ? "error.main" : "success.main",
              }}
              aria-hidden
            />
          </Box>
        )}
        <Typography
          component="div"
          sx={{
            fontFamily: "var(--font-roboto-mono), monospace",
            fontSize: { xs: "6rem", sm: "8rem", md: "11rem" },
            fontWeight: 800,
            letterSpacing: "0.12rem",
            lineHeight: 1,
            color: "common.white",
          }}
        >
          {pad(mm)}:{pad(ss)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default TimerDisplay;
