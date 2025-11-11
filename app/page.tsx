// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
"use client";
import { VolumeUp } from "@mui/icons-material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SpeakerIcon from "@mui/icons-material/Speaker";
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Slider,
  Typography,
} from "@mui/material";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import GoogleDocViewer from "../components/GoogleDocViewer";
import HrTile from "../components/HrTile";
import TimerDisplay from "../components/TimerDisplay";
import { useAudio } from "../hooks/useAudio";
import useSpotifyWebPlayback from "../hooks/useSpotifyWebPlayback";
import useVolumePreference, { clampVolume } from "../hooks/useVolumePreference";
import useWebSocket from "../hooks/useWebSocket";
import { SpotifyCommandMessage } from "../types/websocket";
import { MAX_HR_DEFAULT } from "../utils/constants";
import { getHrZoneProps } from "../utils/visualization";

const DOC_URL =
  "https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true"; // Ensure embedded view for full-screen content

interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

const Dashboard = () => {
  const { hrmData, timerData, connectionStatus, spotifyData, sendData } =
    useWebSocket();

  const { data: session } = useSession();

  const { volume, setVolume } = useVolumePreference(70);
  const lastSentVolumeRef = useRef<string | null>(null);

  // Play server-driven Tabata sounds ON THE DASHBOARD (not control panel)
  const { initializeAudio } = useAudio(timerData, volume);

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeAudio();
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("keydown", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [initializeAudio]);

  // Initialize Spotify Web Playback SDK on the dashboard
  const {
    player,
    isReady,
    deviceId,
    error: webPlaybackError,
    isAuthenticated: spotifyAuthenticated,
  } = useSpotifyWebPlayback();

  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([]);
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const deviceMenuOpen = Boolean(deviceMenuAnchor);

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== "Connected") return;
      const sanitized = clampVolume(value);
      const targetDeviceId =
        selectedDeviceId ||
        availableDevices.find((device) => device.is_active)?.id;
      const messageKey = `${targetDeviceId ?? "default"}:${sanitized}`;
      if (lastSentVolumeRef.current === messageKey) return;
      const message: SpotifyCommandMessage = {
        type: "SPOTIFY_COMMAND",
        command: "SET_VOLUME",
        volume: sanitized,
        ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
      };
      sendData(message);
      lastSentVolumeRef.current = messageKey;
    },
    [availableDevices, connectionStatus, selectedDeviceId, sendData]
  );

  useEffect(() => {
    sendVolumeCommand(volume);
  }, [volume, sendVolumeCommand]);

  useEffect(() => {
    if (connectionStatus !== "Connected") {
      lastSentVolumeRef.current = null;
    }
  }, [connectionStatus]);

  useEffect(() => {
    if (!player || typeof player.setVolume !== "function") return;
    const scalar = Math.min(Math.max(volume / 100, 0), 1);
    player
      .setVolume(scalar)
      .catch((err) =>
        console.warn("[Dashboard] Failed to adjust local Spotify volume:", err)
      );
  }, [player, volume]);

  // Spotify device management

  // Check if user is logged in
  const spotifyLoggedIn = !!session?.accessToken || spotifyAuthenticated;

  // Fetch available Spotify devices
  useEffect(() => {
    if (spotifyLoggedIn && spotifyData.trackName) {
      const fetchDevices = async () => {
        try {
          const response = await fetch("/api/spotify/devices");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const devices = await response.json();
          console.log("[Dashboard] Fetched devices:", devices);
          const deviceArray = Array.isArray(devices) ? devices : [];
          setAvailableDevices(deviceArray);
        } catch (error) {
          console.error("[Dashboard] Failed to fetch Spotify devices:", error);
        }
      };
      fetchDevices();
    } else {
      setAvailableDevices([]);
      setSelectedDeviceId("");
    }
  }, [spotifyLoggedIn, spotifyData.trackName]);

  useEffect(() => {
    if (availableDevices.length === 0) {
      if (selectedDeviceId !== "") {
        setSelectedDeviceId("");
      }
      return;
    }

    const activeDevice = availableDevices.find((device) => device.is_active);

    if (!selectedDeviceId && activeDevice) {
      setSelectedDeviceId(activeDevice.id);
      return;
    }

    if (
      selectedDeviceId &&
      !availableDevices.some((device) => device.id === selectedDeviceId)
    ) {
      setSelectedDeviceId(activeDevice?.id ?? "");
    }
  }, [availableDevices, selectedDeviceId]);

  // Spotify command handler
  const sendSpotifyCommand = (
    command: "PLAY" | "PAUSE" | "NEXT" | "PREVIOUS" | "TRANSFER_PLAYBACK",
    targetDeviceId?: string
  ) => {
    const message: SpotifyCommandMessage = {
      type: "SPOTIFY_COMMAND",
      command,
      ...(targetDeviceId && { deviceId: targetDeviceId }),
    };
    sendData(message);
    console.log("[Dashboard] Sent Spotify command:", message);
  };

  const handlePlayPauseToggle = () => {
    const command = spotifyData.isPlaying ? "PAUSE" : "PLAY";
    sendSpotifyCommand(command);
  };

  const handleDeviceSelect = (deviceId: string) => {
    console.log("[Dashboard] Transferring playback to device:", deviceId);
    setSelectedDeviceId(deviceId);
    sendSpotifyCommand("TRANSFER_PLAYBACK", deviceId);
    setDeviceMenuAnchor(null);
  };

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
        pb: { xs: 12, sm: 14 }, // Extra bottom padding for fixed Spotify bar
        minHeight: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
        {/* --------------------- TOP ROW: TIMER + HR TILES --------------------- */}

        {/* 1. TABATA TIMER - Componentized */}
        <Grid item xs={12} lg={6}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            timeElapsed={timerData.timeElapsed}
            cycle={timerData.cycle}
            totalCycles={timerData.totalCycles}
            mode={timerData.mode}
            workDuration={timerData.workDuration}
            restDuration={timerData.restDuration}
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
                <Grid item xs={12} sm={6} lg={3} key={user.clientId}>
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
            <Grid item xs={12} sm={6} lg={3}>
              <Skeleton
                variant="rectangular"
                height={250}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
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
                {/* Left side: Track info and status */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flex: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {spotifyData.trackName} — {spotifyData.artist}
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

                {/* Center: Playback controls */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => sendSpotifyCommand("PREVIOUS")}
                    sx={{
                      color: "common.white",
                      "&:hover": { backgroundColor: "grey.800" },
                    }}
                    aria-label="Previous track"
                  >
                    <SkipPreviousIcon />
                  </IconButton>
                  <IconButton
                    size="medium"
                    onClick={handlePlayPauseToggle}
                    sx={{
                      color: "common.white",
                      backgroundColor: "grey.700",
                      "&:hover": { backgroundColor: "grey.600" },
                    }}
                    aria-label={spotifyData.isPlaying ? "Pause" : "Play"}
                  >
                    {spotifyData.isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => sendSpotifyCommand("NEXT")}
                    sx={{
                      color: "common.white",
                      "&:hover": { backgroundColor: "grey.800" },
                    }}
                    aria-label="Next track"
                  >
                    <SkipNextIcon />
                  </IconButton>
                </Box>

                {/* Right side: Volume, Device selector and logout */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {/* Volume Control */}
                  <VolumeUp sx={{ color: "grey.400", fontSize: 18 }} />
                  <Slider
                    value={volume}
                    onChange={(_, val) => setVolume(val as number)}
                    onChangeCommitted={(_, val) =>
                      sendVolumeCommand(val as number)
                    }
                    min={0}
                    max={100}
                    size="small"
                    sx={{
                      width: 80,
                      color: "#1DB954",
                      "& .MuiSlider-thumb": {
                        backgroundColor: "white",
                        width: 12,
                        height: 12,
                      },
                      "& .MuiSlider-track": { height: 3 },
                      "& .MuiSlider-rail": { height: 3 },
                    }}
                  />

                  {/* Device Selector */}
                  <IconButton
                    size="small"
                    onClick={(e) => setDeviceMenuAnchor(e.currentTarget)}
                    sx={{
                      color: "common.white",
                      "&:hover": { backgroundColor: "grey.800" },
                    }}
                    aria-label="Select playback device"
                  >
                    <SpeakerIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={deviceMenuAnchor}
                    open={deviceMenuOpen}
                    onClose={() => setDeviceMenuAnchor(null)}
                    anchorOrigin={{
                      vertical: "top",
                      horizontal: "right",
                    }}
                    transformOrigin={{
                      vertical: "bottom",
                      horizontal: "right",
                    }}
                  >
                    {availableDevices.length > 0 ? (
                      availableDevices.map((device) => (
                        <MenuItem
                          key={device.id}
                          onClick={() => handleDeviceSelect(device.id)}
                          selected={device.is_active}
                        >
                          {device.name} {device.is_active && "✓"}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>No devices available</MenuItem>
                    )}
                  </Menu>

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
                      px: 1.5,
                      fontSize: "0.75rem",
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
            height={500}
            isShrunk={docIsManuallyShrunk}
            onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
