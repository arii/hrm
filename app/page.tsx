// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
"use client";
import { Box, Container, Grid, Typography } from "@mui/material";
import GoogleDocViewer from "../components/GoogleDocViewer";
import HrTile from "../components/HrTile";
import TimerDisplay from "../components/TimerDisplay";
import useTabataSounds from "../hooks/useTabataSounds";
import useWebSocket from "../hooks/useWebSocket";
import { MAX_HR_DEFAULT } from "../utils/constants";
import { getHrZoneProps } from "../utils/visualization";

const DOC_URL =
  "https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true"; // Ensure embedded view for full-screen content

const Dashboard = () => {
  const {
    hrmData,
    timerData,
    connectionStatus: _connectionStatus,
    spotifyData,
  } = useWebSocket();
  // Play server-driven Tabata sounds
  useTabataSounds(timerData.soundToPlay);

  return (
    <Container
      maxWidth="xl"
      sx={{ py: 3, minHeight: "100vh", backgroundColor: "grey.50" }}
    >
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
          hrmData
            // Suppress placeholder entries and zero-value tiles
            .filter((user) => {
              const isZero = user.value === 0;
              const isPlaceholderName =
                !!user.name && /new user/i.test(user.name);
              const hasNoIdentity = user.name == null;
              // Hide if no data yet, or explicit placeholder, or zero value
              return !(isZero || isPlaceholderName || hasNoIdentity);
            })
            .map((user) => {
              const hrZoneProps = getHrZoneProps(
                user.value,
                user.maxHr || MAX_HR_DEFAULT
              );
              return (
                <Grid item xs={12} md={5} key={user.clientId}>
                  <HrTile
                    name={user.name || ""}
                    bpm={user.value}
                    percentMax={hrZoneProps.percentage}
                    background={hrZoneProps.progressColor}
                  />
                </Grid>
              );
            })}

        {/* --------------------- SPOTIFY DISPLAY (COMPACT BAR) --------------------- */}
        {spotifyData.trackName && (
          <Grid item xs={12}>
            <Box
              aria-label={`Now playing: ${spotifyData.trackName} by ${
                spotifyData.artist
              }, Status: ${spotifyData.isPlaying ? "Playing" : "Paused"}`}
              sx={{
                backgroundColor: "grey.900",
                color: "grey.100",
                px: 2,
                py: 1,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {spotifyData.isPlaying ? "▶" : "⏸"} {spotifyData.trackName} —{" "}
                {spotifyData.artist}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Spotify
              </Typography>
            </Box>
          </Grid>
        )}

        {/* --------------------- BOTTOM ROW: DOCUMENTATION --------------------- */}

        <Grid item xs={12}>
          {/* The Google Doc Viewer component */}
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={DOC_URL}
            height={900}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
