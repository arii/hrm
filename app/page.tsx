// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
"use client";
import { MusicNote, Watch } from "@mui/icons-material";
import { Box, Container, Grid, Paper, Typography } from "@mui/material";
import React, { useMemo } from "react";
import GoogleDocViewer from "../components/GoogleDocViewer";
import useTabataSounds from "../hooks/useTabataSounds";
import useWebSocket from "../hooks/useWebSocket";
import { getHrZoneProps, getTimerProps } from "../utils/visualization";
import TimerDisplay from "../components/TimerDisplay";
import HrTile from "../components/HrTile";
import WorkoutColumns from "../components/WorkoutColumns";

const MAX_HR_DEFAULT = 185;
const DOC_URL =
  "https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub"; // Example URL

// Component to display the current connection status
const StatusIndicator = ({ status }: { status: string }) => {
  const color = useMemo(() => {
    if (status === "Connected") return "success.main";
    if (status === "Connecting...") return "warning.main";
    return "grey.400";
  }, [status]);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 2,
        py: 0.5,
        borderRadius: "9999px",
        backgroundColor: color,
        color: "white",
      }}
    >
      <Box component="span" sx={{ mr: 1, fontSize: "0.75rem" }}>
        ●
      </Box>
      <Typography variant="caption" sx={{ fontWeight: "medium" }}>
        {status}
      </Typography>
    </Box>
  );
};

const Dashboard: React.FC = () => {
  const { hrmData, timerData, spotifyData, connectionStatus } = useWebSocket();
  // Play server-driven Tabata sounds
  useTabataSounds(timerData.soundToPlay);

  // Visualization logic separation
  const timerProps = useMemo(
    () => getTimerProps(timerData.currentPhase),
    [timerData]
  );
  const timerProgressValue = useMemo(() => {
    if (timerData.timeRemaining === 0 || timerData.currentPhase === "IDLE")
      return 0;
    const totalDuration = timerData.currentPhase === "WORK" ? 30 : 10;
    return (timerData.timeRemaining / totalDuration) * 100;
  }, [timerData]);

  return (
    <Container
      maxWidth="xl"
      sx={{ py: 6, minHeight: "100vh", backgroundColor: "grey.50" }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 6,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: "bold", color: "grey.800" }}
        >
          Real-Time Virtual Fitness Dashboard
        </Typography>
        <StatusIndicator status={connectionStatus} />
      </Box>

      <Grid container spacing={2}>
        {/* --------------------- TOP ROW: TIMER + HR TILES --------------------- */}

        {/* 1. TABATA TIMER - Componentized */}
        <Grid item xs={12} md={4}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            cycle={timerData.cycle}
            totalCycles={timerData.totalCycles}
          />
        </Grid>

        {/* 2. HEART RATE PERCENTAGE TILES - Huge Numbers */}
        {hrmData.map((user) => {
          const hrZoneProps = getHrZoneProps(
            user.value,
            user.maxHr || MAX_HR_DEFAULT
          );
          return (
            <Grid item xs={12} md={4} key={user.clientId}>
              <HrTile
                name={user.name || "User"}
                bpm={user.value}
                percentMax={hrZoneProps.percentage}
                background={hrZoneProps.progressColor}
              />
            </Grid>
          );
        })}

        {/* --------------------- SECOND ROW: TABATA INFO + SPOTIFY --------------------- */}

        {/* Tabata Status Info */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography
              variant="h6"
              color="textSecondary"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Watch sx={{ mr: 1 }} /> TABATA INTERVAL
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: "bold", fontSize: "1.5rem" }}
            >
              {timerData.timeRemaining}s
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Cycle {timerData.cycle} of {timerData.totalCycles}
            </Typography>
            <Typography variant="caption" sx={{ mt: 2, display: "block" }}>
              Control the timer via the /client/control page.
            </Typography>
          </Paper>
        </Grid>

        {/* 3. SPOTIFY MUSIC STATUS */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, backgroundColor: "grey.800", color: "white" }}>
            <Typography
              variant="h6"
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
              }}
            >
              <MusicNote sx={{ mr: 1 }} /> NOW PLAYING
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
              {spotifyData.trackName}
            </Typography>
            <Typography variant="body1" sx={{ color: "grey.400", mb: 2 }}>
              {spotifyData.artist}
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500" }}>
              Playback Status: {spotifyData.isPlaying ? "Playing" : "Paused"}
            </Typography>
            <Typography
              variant="caption"
              sx={{ mt: 1, display: "block", color: "grey.600" }}
            >
              Login required via the /client/control page to enable live
              updates.
            </Typography>
          </Paper>
        </Grid>

        {/* --------------------- BOTTOM ROW: DOCUMENTATION --------------------- */}

        <Grid item xs={12}>
          <Box sx={{ mt: 4, mb: 4 }}>
            <Typography
              variant="h5"
              component="h2"
              sx={{ fontWeight: "bold", color: "grey.800" }}
            >
              Workout Plan & Resources
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
              Review the current workout plan and reference materials provided
              by your trainer.
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12}>
          {/* The Google Doc Viewer component */}
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={DOC_URL}
            height={400}
          />
        </Grid>

        {/* Multi-column workout scaffold */}
        <Grid item xs={12}>
          <WorkoutColumns
            columns={[
              { title: "Warm-up", items: [{ title: "5 min easy spin" }] },
              { title: "Main Set", items: [{ title: "8x (30s on / 10s off)" }] },
              { title: "Cool Down", items: [{ title: "3 min light" }] },
            ]}
          />
        </Grid>
      </Grid>

      <Box
        sx={{
          mt: 8,
          textAlign: "center",
          color: "grey.500",
          fontSize: "0.875rem",
        }}
      >
        Dashboard served from unified server at 127.0.0.1:3000.
      </Box>
    </Container>
  );
};

export default Dashboard;
