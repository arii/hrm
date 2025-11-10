// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
"use client";
import { Box, Container, Grid, Typography } from "@mui/material";
import { useMemo } from "react";
import GoogleDocViewer from "../components/GoogleDocViewer";
import HrTile from "../components/HrTile";
import TimerDisplay from "../components/TimerDisplay";
import useTabataSounds from "../hooks/useTabataSounds";
import useWebSocket from "../hooks/useWebSocket";
import { MAX_HR_DEFAULT } from "../utils/constants";
import { getHrZoneProps } from "../utils/visualization";

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

const Dashboard = () => {
  const { hrmData, timerData, connectionStatus, spotifyData } = useWebSocket();
  // Play server-driven Tabata sounds
  useTabataSounds(timerData.soundToPlay);

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
        <Grid item xs={12} md={7}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            cycle={timerData.cycle}
            totalCycles={timerData.totalCycles}
          />
        </Grid>

        {/* 2. HEART RATE PERCENTAGE TILES - Huge Numbers */}
        {hrmData.length > 0 &&
          hrmData.map((user) => {
            const hrZoneProps = getHrZoneProps(
              user.value,
              user.maxHr || MAX_HR_DEFAULT
            );
            return (
              <Grid item xs={12} md={5} key={user.clientId}>
                <HrTile
                  name={user.name || "User"}
                  bpm={user.value}
                  percentMax={hrZoneProps.percentage}
                  background={hrZoneProps.progressColor}
                />
              </Grid>
            );
          })}

        {/* --------------------- SPOTIFY DISPLAY --------------------- */}
        <Grid item xs={12}>
          <Box
            sx={{
              backgroundColor: "primary.dark",
              color: "white",
              p: 3,
              borderRadius: 3,
              textAlign: "center",
              mb: 4,
            }}
          >
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              NOW PLAYING
            </Typography>
            {spotifyData.trackName ? (
              <>
                <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                  {spotifyData.trackName}
                </Typography>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  {spotifyData.artist}
                </Typography>
                <Typography variant="subtitle1">
                  Status: {spotifyData.isPlaying ? "Playing" : "Paused"}
                </Typography>
              </>
            ) : (
              <Typography variant="h5">Awaiting Spotify Data...</Typography>
            )}
          </Box>
        </Grid>

        {/* --------------------- BOTTOM ROW: DOCUMENTATION --------------------- */}

        <Grid item xs={12}>
          {/* The Google Doc Viewer component */}
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={DOC_URL}
            height={400}
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
