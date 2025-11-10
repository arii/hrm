// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
"use client";
import {
  Box,
  Button,
  Container,
  Grid,
  Skeleton,
  Typography,
} from "@mui/material";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import GoogleDocViewer from "../components/GoogleDocViewer";
import HrTile from "../components/HrTile";
import TimerDisplay from "../components/TimerDisplay";
import useSpotifyWebPlayback from "../hooks/useSpotifyWebPlayback";
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
    sendData: _sendData,
  } = useWebSocket();

  const { data: session } = useSession();

  // Play server-driven Tabata sounds ON THE DASHBOARD (not control panel)
  useTabataSounds(timerData.soundToPlay);

  // Initialize Spotify Web Playback SDK on the dashboard
  const {
    player: _player,
    isReady,
    deviceId,
    error: webPlaybackError,
    isAuthenticated: spotifyAuthenticated,
  } = useSpotifyWebPlayback();

  const isTimerActive = timerData.currentPhase !== "IDLE";
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false);

  // Check if user is logged in
  const spotifyLoggedIn = !!session?.accessToken || spotifyAuthenticated;

  const handleSpotifyLogin = () => {
    signIn("spotify", { callbackUrl: "/" });
  };

  const handleSpotifyLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: { xs: 2, sm: 3 },
        minHeight: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
        {/* --------------------- TOP ROW: TIMER + HR TILES --------------------- */}

        {/* 1. TABATA TIMER - Componentized */}
        <Grid item xs={12} lg={isTimerActive ? 12 : 6}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            cycle={timerData.cycle}
            totalCycles={timerData.totalCycles}
          />
        </Grid>

        {/* 2. HEART RATE PERCENTAGE TILES - Huge Numbers */}
        {hrmData.length > 0 ? (
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
                <Grid
                  item
                  xs={12}
                  sm={6}
                  lg={isTimerActive ? 6 : 3}
                  key={user.clientId}
                >
                  <HrTile
                    name={user.name || ""}
                    bpm={user.value}
                    percentMax={hrZoneProps.percentage}
                    background={hrZoneProps.progressColor}
                  />
                </Grid>
              );
            })
        ) : (
          // Render skeleton loaders when no HR data
          <>
            <Grid item xs={12} sm={6} lg={isTimerActive ? 6 : 3}>
              <Skeleton
                variant="rectangular"
                height={250}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={isTimerActive ? 6 : 3}>
              <Skeleton
                variant="rectangular"
                height={250}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          </>
        )}

        {/* --------------------- SPOTIFY DISPLAY (COMPACT BAR) --------------------- */}
        {spotifyLoggedIn &&
          spotifyData.trackName &&
          spotifyData.trackName !== "Awaiting Login..." && (
            <Grid item xs={12}>
              <Box
                aria-label={`Now playing: ${spotifyData.trackName} by ${
                  spotifyData.artist
                }, Status: ${spotifyData.isPlaying ? "Playing" : "Paused"}${
                  isReady ? ", Browser player ready" : ""
                }`}
                sx={{
                  backgroundColor: "grey.900",
                  color: "common.white",
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "fixed", // Make it a floating bar
                  bottom: 56, // Height of BottomNavBar + small gap
                  left: 0,
                  right: 0,
                  zIndex: 1100, // Higher than BottomNavBar (1000)
                  boxShadow: 3, // Use theme shadow
                  mb: 0, // Remove bottom margin as it's fixed
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {spotifyData.isPlaying ? "▶" : "⏸"} {spotifyData.trackName}{" "}
                    — {spotifyData.artist}
                  </Typography>
                  {/* Web Playback SDK Status Indicator */}
                  {spotifyAuthenticated && !isReady && !webPlaybackError && (
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.8,
                        backgroundColor: "info.main",
                        color: "common.white",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      🔄 Connecting Player...
                    </Typography>
                  )}
                  {isReady && deviceId && (
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.8,
                        backgroundColor: "success.main",
                        color: "common.white",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      🎵 Browser Player Active
                    </Typography>
                  )}
                  {webPlaybackError && (
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.9,
                        backgroundColor: "error.main",
                        color: "common.white",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      ⚠️ Player Error
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Spotify
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSpotifyLogout}
                    sx={{
                      color: "common.white",
                      borderColor: "grey.600",
                      "&:hover": {
                        borderColor: "grey.500",
                        backgroundColor: "grey.800",
                      },
                      minWidth: "auto",
                      px: 2,
                    }}
                  >
                    Logout
                  </Button>
                </Box>
              </Box>
            </Grid>
          )}

        {/* Spotify Login Button (when not logged in) */}
        {!spotifyLoggedIn && (
          <Grid item xs={12}>
            <Box
              sx={{
                backgroundColor: "grey.900",
                color: "common.white",
                px: 3,
                py: 1.5,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "fixed",
                bottom: 56, // Height of BottomNavBar + small gap
                left: 0,
                right: 0,
                zIndex: 1100, // Higher than BottomNavBar (1000)
                boxShadow: 3,
                mb: 0,
              }}
            >
              <Button
                variant="contained"
                color="success"
                onClick={handleSpotifyLogin}
                sx={{ px: 4, py: 1 }}
              >
                🎵 Login with Spotify
              </Button>
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
            isShrunk={isTimerActive || docIsManuallyShrunk}
            onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
