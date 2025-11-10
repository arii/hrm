// File: app/client/control/page.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
"use client";
import {
  Add, // New import for stepper
  MusicNote,
  Pause,
  PlayArrow,
  Remove, // New import for stepper
  SkipNext,
  SkipPrevious,
  Stop, // New import for stop button
  VolumeUp,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import useWebSocket from "../../../hooks/useWebSocket";
import {
  SpotifyCommandMessage,
  TimerCommandMessage,
} from "../../../types/websocket";

// Define SpotifyDevice interface for client-side use
interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

const ControlPanel = () => {
  const { timerData, spotifyData, connectionStatus, sendData } = useWebSocket();

  // Timer configuration state
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [volume, setVolume] = useState(50);

  // Input validation states
  const [isValidWorkTime, _setIsValidWorkTime] = useState(true);
  const [isValidRestTime, _setIsValidRestTime] = useState(true);

  // Spotify device management states
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  // Simple check: if we have real track data, Spotify is working
  const hasSpotifyData =
    spotifyData.trackName !== "Awaiting Login..." &&
    spotifyData.trackName !== "" &&
    spotifyData.trackName !== "No Track Playing";

  // Check if we have active playback
  const hasActivePlayback =
    spotifyData.trackName !== "Awaiting Login..." &&
    spotifyData.trackName !== "No Track Playing" &&
    spotifyData.trackName !== "";

  // Fetch available Spotify devices
  useEffect(() => {
    if (hasSpotifyData) {
      const fetchDevices = async () => {
        setDevicesLoading(true);
        setDevicesError(null);
        try {
          const response = await fetch("/api/spotify/devices");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const devices = await response.json();
          console.log("[Control Panel] Fetched devices:", devices);
          setAvailableDevices(Array.isArray(devices) ? devices : []);

          // Auto-select the active device if one exists
          const activeDevice =
            Array.isArray(devices) &&
            devices.find((d: SpotifyDevice) => d.is_active);
          if (activeDevice && !selectedDeviceId) {
            setSelectedDeviceId(activeDevice.id);
            console.log(
              "[Control Panel] Auto-selected active device:",
              activeDevice.name
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load devices.";
          console.error("Failed to fetch Spotify devices:", error);
          setDevicesError(errorMessage);
        } finally {
          setDevicesLoading(false);
        }
      };
      fetchDevices();
    } else {
      setAvailableDevices([]);
      setSelectedDeviceId("");
    }
  }, [hasSpotifyData, selectedDeviceId]);

  // --- Timer Commands ---
  const _sendTimerCommand = (command: "START" | "PAUSE" | "STOP") => {
    // Only send command if inputs are valid
    if (!isValidWorkTime || !isValidRestTime) {
      console.warn("Cannot start timer with invalid work/rest durations.");
      return;
    }

    const message: TimerCommandMessage = {
      type: "TIMER_COMMAND",
      command,
      ...(command === "START" && {
        workDuration: workTime,
        restDuration: restTime,
        totalCycles: 8,
      }),
    };
    sendData(message);
  };

  // --- Spotify Commands ---
  const sendSpotifyCommand = (
    command: "PLAY" | "PAUSE" | "NEXT" | "PREVIOUS" | "TRANSFER_PLAYBACK",
    deviceId?: string
  ) => {
    const message: SpotifyCommandMessage = {
      type: "SPOTIFY_COMMAND",
      command,
      deviceId,
    };
    sendData(message);
  };

  // Timer preset configurations
  const _applyPreset = (
    preset: "EMOM_20_10" | "EMOM_30_15" | "RUNNING_CLOCK"
  ) => {
    if (preset === "EMOM_20_10") {
      setWorkTime(20);
      setRestTime(10);
    } else if (preset === "EMOM_30_15") {
      setWorkTime(30);
      setRestTime(15);
    } else if (preset === "RUNNING_CLOCK") {
      // Running clock - continuous work, no rest
      setWorkTime(60);
      setRestTime(0);
    }
  };

  return (
    <Container
      maxWidth="xs"
      sx={{
        py: { xs: 2, sm: 3 },
        px: { xs: 2, sm: 3 },
        minHeight: "100vh",
        backgroundColor: "background.default",
      }}
    >
      {/* 1. Tabata Timer Controls */}
      <Card
        sx={{
          boxShadow: 6,
          mb: 3,
          backgroundColor: "#000000",
          color: "#EF4444",
          position: "sticky",
          top: 16,
          zIndex: 1000,
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Timer Display */}
          <Box
            sx={{ textAlign: "center", mb: 3 }}
            role="timer"
            aria-live="polite"
          >
            <Typography
              variant="h2"
              component="div"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#EF4444",
                fontSize: { xs: "4.5rem", sm: "5.5rem" },
                textShadow: "0 0 20px rgba(239, 68, 68, 0.5)",
              }}
            >
              {timerData.timeRemaining}
            </Typography>
            <Typography variant="body1" sx={{ color: "white", mt: 1 }}>
              {timerData.currentPhase || "IDLE"} • Cycle {timerData.cycle}/
              {timerData.totalCycles}
            </Typography>
          </Box>

          {/* Timer Configuration Controls */}
          <Stack spacing={4} sx={{ mb: 4 }}>
            {" "}
            {/* Increased spacing */}
            {/* Work Duration Stepper */}
            <Box>
              <Typography sx={{ color: "white", fontWeight: "medium", mb: 2 }}>
                {" "}
                {/* Increased mb */}
                Work Duration (seconds)
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={3}
              >
                {" "}
                {/* Increased spacing */}
                <IconButton
                  color="primary"
                  onClick={() => setWorkTime((prev) => Math.max(0, prev - 5))}
                  aria-label="Decrease work duration"
                  sx={{
                    backgroundColor: "grey.700",
                    color: "white",
                    "&:hover": { backgroundColor: "grey.600" },
                    p: 2,
                  }} // Increased padding
                >
                  <Remove fontSize="large" />
                </IconButton>
                <Typography
                  variant="h4"
                  sx={{
                    color: "red",
                    fontWeight: "bold",
                    fontSize: "3rem", // Further increased font size
                    minWidth: "100px", // Increased minWidth
                    textAlign: "center",
                  }}
                >
                  {workTime}
                </Typography>
                <IconButton
                  color="primary"
                  onClick={() => setWorkTime((prev) => prev + 5)}
                  aria-label="Increase work duration"
                  sx={{
                    backgroundColor: "grey.700",
                    color: "white",
                    "&:hover": { backgroundColor: "grey.600" },
                    p: 2,
                  }} // Increased padding
                >
                  <Add fontSize="large" />
                </IconButton>
              </Stack>
            </Box>
            {/* Rest Duration Stepper */}
            <Box>
              <Typography sx={{ color: "white", fontWeight: "medium", mb: 2 }}>
                {" "}
                {/* Increased mb */}
                Rest Duration (seconds)
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={3}
              >
                {" "}
                {/* Increased spacing */}
                <IconButton
                  color="primary"
                  onClick={() => setRestTime((prev) => Math.max(0, prev - 5))}
                  aria-label="Decrease rest duration"
                  sx={{
                    backgroundColor: "grey.700",
                    color: "white",
                    "&:hover": { backgroundColor: "grey.600" },
                    p: 2,
                  }} // Increased padding
                >
                  <Remove fontSize="large" />
                </IconButton>
                <Typography
                  variant="h4"
                  sx={{
                    color: "red",
                    fontWeight: "bold",
                    fontSize: "3rem", // Further increased font size
                    minWidth: "100px", // Increased minWidth
                    textAlign: "center",
                  }}
                >
                  {restTime}
                </Typography>
                <IconButton
                  color="primary"
                  onClick={() => setRestTime((prev) => prev + 5)}
                  aria-label="Increase rest duration"
                  sx={{
                    backgroundColor: "grey.700",
                    color: "white",
                    "&:hover": { backgroundColor: "grey.600" },
                    p: 2,
                  }} // Increased padding
                >
                  <Add fontSize="large" />
                </IconButton>
              </Stack>
            </Box>
          </Stack>

          {/* Timer Control Buttons */}
          <Stack direction="row" spacing={3} sx={{ mt: 4 }}>
            {" "}
            {/* Increased spacing and mt */}
            <Button
              variant="contained"
              color="success"
              onClick={() => _sendTimerCommand("START")}
              disabled={connectionStatus !== "Connected"}
              sx={{ flex: 1, fontWeight: "bold", py: 1.5 }} // Increased padding
              startIcon={<PlayArrow fontSize="large" />}
            >
              START
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => _sendTimerCommand("STOP")}
              disabled={connectionStatus !== "Connected"}
              sx={{ flex: 1, fontWeight: "bold", py: 1.5 }} // Increased padding
              startIcon={<Stop fontSize="large" />}
            >
              STOP
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 2. Spotify Controls */}
      <Card
        sx={{
          boxShadow: 3,
          p: 2,
          mb: 3,
          backgroundColor: "grey.800",
          color: "white",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            display: "flex",
            alignItems: "center",
            fontWeight: "semibold",
            mb: 1.5,
            color: "grey.200",
          }}
        >
          <MusicNote sx={{ mr: 1 }} aria-hidden="true" /> Spotify Player
        </Typography>

        {hasSpotifyData ? (
          <CardContent sx={{ p: 0 }}>
            {/* Show device/playback status message */}
            {!hasActivePlayback && availableDevices.length === 0 && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  backgroundColor: "warning.dark",
                  borderRadius: 1,
                  mx: 2,
                  mt: 2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: "medium", mb: 1 }}
                >
                  ⚠️ No Active Spotify Devices
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", opacity: 0.9 }}
                >
                  To control playback:
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", opacity: 0.9, ml: 2 }}
                >
                  • Open Spotify on any device
                  <br />
                  • Start playing a song
                  <br />• Controls will appear here
                </Typography>
              </Box>
            )}

            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                {spotifyData.trackName}
              </Typography>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ color: "grey.400", mb: 3 }}
              >
                by {spotifyData.artist}
              </Typography>
            </Box>

            {/* Spotify Device Selection */}
            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
              <InputLabel
                id="spotify-device-select-label"
                sx={{ color: "grey.400" }}
              >
                Active Device
              </InputLabel>
              <Select
                labelId="spotify-device-select-label"
                value={selectedDeviceId}
                onChange={(e) => {
                  const newDeviceId = e.target.value as string;
                  console.log("[Control Panel] Device selected:", newDeviceId);
                  setSelectedDeviceId(newDeviceId);
                  if (newDeviceId) {
                    console.log(
                      "[Control Panel] Transferring playback to:",
                      newDeviceId
                    );
                    sendSpotifyCommand("TRANSFER_PLAYBACK", newDeviceId);
                  }
                }}
                label="Active Device"
                sx={{
                  color: "white",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "grey.600",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "grey.400",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "white",
                  },
                  "& .MuiSvgIcon-root": { color: "grey.400" }, // Dropdown arrow color
                }}
                disabled={devicesLoading || availableDevices.length === 0}
              >
                {devicesLoading && (
                  <MenuItem value="" disabled>
                    Loading devices...
                  </MenuItem>
                )}
                {devicesError && (
                  <MenuItem value="" disabled>
                    Error: {devicesError}
                  </MenuItem>
                )}
                {availableDevices.length === 0 &&
                  !devicesLoading &&
                  !devicesError && (
                    <MenuItem value="" disabled>
                      No devices found
                    </MenuItem>
                  )}
                {availableDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name} ({device.type}){" "}
                    {device.is_active ? "(Active)" : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack
              direction="row"
              spacing={3}
              justifyContent="center"
              sx={{ mb: 3 }}
            >
              <IconButton
                size="large"
                sx={{
                  color: "white",
                  "&:hover": { backgroundColor: "grey.700" },
                  "&:active": {
                    backgroundColor: "grey.600",
                    transform: "scale(0.95)",
                  },
                  transition: "all 0.1s",
                }}
                onClick={() => {
                  console.log("[Control Panel] Previous track clicked");
                  sendSpotifyCommand("PREVIOUS");
                }}
                disabled={connectionStatus !== "Connected" || !hasSpotifyData}
                aria-label="Previous track"
              >
                <SkipPrevious fontSize="large" />
              </IconButton>
              <IconButton
                size="large"
                color="success"
                sx={{
                  backgroundColor: "success.main",
                  "&:hover": { backgroundColor: "success.dark" },
                  "&:active": {
                    backgroundColor: "success.darker",
                    transform: "scale(0.95)",
                  },
                  color: "white",
                  transition: "all 0.1s",
                }}
                onClick={() => {
                  const command = spotifyData.isPlaying ? "PAUSE" : "PLAY";
                  console.log("[Control Panel] Play/Pause clicked:", command);
                  sendSpotifyCommand(command);
                }}
                disabled={connectionStatus !== "Connected" || !hasSpotifyData}
                aria-label={spotifyData.isPlaying ? "Pause" : "Play"}
              >
                {spotifyData.isPlaying ? (
                  <Pause fontSize="large" />
                ) : (
                  <PlayArrow fontSize="large" />
                )}
              </IconButton>
              <IconButton
                size="large"
                sx={{
                  color: "white",
                  "&:hover": { backgroundColor: "grey.700" },
                  "&:active": {
                    backgroundColor: "grey.600",
                    transform: "scale(0.95)",
                  },
                  transition: "all 0.1s",
                }}
                onClick={() => {
                  console.log("[Control Panel] Next track clicked");
                  sendSpotifyCommand("NEXT");
                }}
                disabled={connectionStatus !== "Connected" || !hasSpotifyData}
                aria-label="Next track"
              >
                <SkipNext fontSize="large" />
              </IconButton>
            </Stack>

            {/* Volume Control */}
            <Box sx={{ px: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <VolumeUp sx={{ color: "grey.400" }} aria-hidden="true" />
                <Slider
                  aria-label="Volume"
                  value={volume}
                  onChange={(_: Event, newValue: number | number[]) =>
                    setVolume(newValue as number)
                  }
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                  getAriaValueText={(value) => `Volume: ${value}%`}
                  sx={{
                    color: "grey.400",
                    "& .MuiSlider-thumb": {
                      backgroundColor: "white",
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: "grey.400", minWidth: "3ch" }}
                >
                  {volume}
                </Typography>
              </Stack>
            </Box>
          </CardContent>
        ) : (
          <CardContent sx={{ p: 2 }}>
            <Typography
              variant="body2"
              sx={{ color: "grey.400", mb: 2, textAlign: "center" }}
            >
              Login to Spotify on the main dashboard to control playback
            </Typography>
          </CardContent>
        )}
      </Card>
    </Container>
  );
};

export default ControlPanel;
