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
  Slider,
  Stack,
  TextField,
  Typography,
  Select,
} from "@mui/material";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAudioPlayer } from "../../../hooks/useAudioPlayer";
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
  const { initAudio, playSound } = useAudioPlayer();

  // Timer configuration state
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [volume, setVolume] = useState(50);

  // Input validation states
  const [isValidWorkTime, setIsValidWorkTime] = useState(true);
  const [isValidRestTime, setIsValidRestTime] = useState(true);

  // Spotify device management states
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  // --- Timer Commands ---
  const _sendTimerCommand = (command: "START" | "PAUSE" | "STOP") => {
    // Only send command if inputs are valid
    if (!isValidWorkTime || !isValidRestTime) {
      console.warn("Cannot start timer with invalid work/rest durations.");
      return;
    }

    if (command === "START") {
      initAudio(); // Initialize audio on user interaction
      // Send config with START command
      const message: TimerCommandMessage = {
        type: "TIMER_COMMAND",
        command,
        workDuration: workTime,
        restDuration: restTime,
        totalCycles: 8, // Default, could be made configurable
      };
      sendData(message);
    } else {
      const message: TimerCommandMessage = { type: "TIMER_COMMAND", command };
      sendData(message);
    }
  };

  // --- Spotify Commands ---
  const sendSpotifyCommand = (
    command: "PLAY" | "PAUSE" | "NEXT" | "PREVIOUS" | "TRANSFER_PLAYBACK",
    deviceId?: string
  ) => {
    const message: SpotifyCommandMessage = { type: "SPOTIFY_COMMAND", command, deviceId };
    sendData(message); // sendData now accepts the typed object
  };

  const handleSpotifyLogin = () => {
    // Trigger the NextAuth login flow
    signIn("spotify", { callbackUrl: "/client/control" });
  };

  // Fetch available Spotify devices
  useEffect(() => {
    if (spotifyLoggedIn) {
      const fetchDevices = async () => {
        setDevicesLoading(true);
        setDevicesError(null);
        try {
          const response = await fetch("/api/spotify/devices");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const devices: SpotifyDevice[] = await response.json();
          setAvailableDevices(devices);
          // Automatically select the active device if one exists
          const activeDevice = devices.find((d) => d.is_active);
          if (activeDevice) {
            setSelectedDeviceId(activeDevice.id);
          } else if (devices.length > 0) {
            // Otherwise, select the first available device
            setSelectedDeviceId(devices[0].id);
          }
        } catch (error: any) {
          console.error("Failed to fetch Spotify devices:", error);
          setDevicesError(error.message || "Failed to load devices.");
        } finally {
          setDevicesLoading(false);
        }
      };
      fetchDevices();
    } else {
      setAvailableDevices([]);
      setSelectedDeviceId("");
    }
  }, [spotifyLoggedIn]);

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

  // Check if we have received a non-default song title
  const spotifyLoggedIn = spotifyData.trackName !== "Awaiting Login...";

  // Handle incoming sound commands from the server
  useEffect(() => {
    if (timerData.soundToPlay) {
      playSound(timerData.soundToPlay);
    }
  }, [timerData.soundToPlay, playSound]);

  return (
    <Container
      maxWidth="xs"
      sx={{ py: 8, minHeight: "100vh", backgroundColor: "grey.100" }}
    >
      <Typography
        variant="h5"
        component="h1"
        sx={{
          fontWeight: "bold",
          textAlign: "center",
          mb: 6,
          color: "grey.800",
        }}
      >
        Workout Control Center
      </Typography>

      {/* Status Indicator */}
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <Typography variant="caption">Server Status:</Typography>
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            ml: 2,
            px: 1.5,
            py: 0.5,
            borderRadius: "9999px",
            fontSize: "0.875rem",
            fontWeight: "medium",
            backgroundColor:
              connectionStatus === "Connected" ? "success.main" : "error.main",
            color: "white",
          }}
        >
          {connectionStatus}
        </Box>
      </Box>

      {/* 1. Tabata Timer Controls */}
      <Card
        sx={{
          boxShadow: 3,
          p: 2,
          mb: 3,
          backgroundColor: "black",
          color: "red",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Timer Display */}
          <Box sx={{ textAlign: "center", mb: 4 }} role="timer" aria-live="polite">
            <Typography
              variant="h2"
              component="div"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                color: "red",
                fontSize: { xs: "4rem", sm: "6rem", md: "7rem" }, // Slightly increased from 3.5/5/6
              }}
            >
              {timerData.timeRemaining}
            </Typography>
            <Typography variant="h6" sx={{ color: "white", mt: 1 }}>
              Phase: {timerData.currentPhase || "IDLE"}
            </Typography>
            <Typography variant="h6" sx={{ color: "white", mt: 0.5 }}>
              Cycle: {timerData.cycle} of {timerData.totalCycles}
            </Typography>
          </Box>

          {/* Timer Configuration Controls */}
          <Stack spacing={4} sx={{ mb: 4 }}> {/* Increased spacing */}
            {/* Work Duration Stepper */}
            <Box>
              <Typography sx={{ color: "white", fontWeight: "medium", mb: 2 }}> {/* Increased mb */}
                Work Duration (seconds)
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={3}> {/* Increased spacing */}
                <IconButton
                  color="primary"
                  onClick={() => setWorkTime((prev) => Math.max(0, prev - 5))}
                  aria-label="Decrease work duration"
                  sx={{ backgroundColor: "grey.700", color: "white", "&:hover": { backgroundColor: "grey.600" }, p: 2 }} // Increased padding
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
                  sx={{ backgroundColor: "grey.700", color: "white", "&:hover": { backgroundColor: "grey.600" }, p: 2 }} // Increased padding
                >
                  <Add fontSize="large" />
                </IconButton>
              </Stack>
            </Box>

            {/* Rest Duration Stepper */}
            <Box>
              <Typography sx={{ color: "white", fontWeight: "medium", mb: 2 }}> {/* Increased mb */}
                Rest Duration (seconds)
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={3}> {/* Increased spacing */}
                <IconButton
                  color="primary"
                  onClick={() => setRestTime((prev) => Math.max(0, prev - 5))}
                  aria-label="Decrease rest duration"
                  sx={{ backgroundColor: "grey.700", color: "white", "&:hover": { backgroundColor: "grey.600" }, p: 2 }} // Increased padding
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
                  sx={{ backgroundColor: "grey.700", color: "white", "&:hover": { backgroundColor: "grey.600" }, p: 2 }} // Increased padding
                >
                  <Add fontSize="large" />
                </IconButton>
              </Stack>
            </Box>
          </Stack>

          {/* Timer Control Buttons */}
          <Stack direction="row" spacing={3} sx={{ mt: 4 }}> {/* Increased spacing and mt */}
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

        {spotifyLoggedIn ? (
          <CardContent sx={{ p: 0 }}>
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

            {/* Spotify Device Selection */}
            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
              <InputLabel id="spotify-device-select-label" sx={{ color: "grey.400" }}>
                Active Device
              </InputLabel>
              <Select
                labelId="spotify-device-select-label"
                value={selectedDeviceId}
                onChange={(e) => {
                  const newDeviceId = e.target.value as string;
                  setSelectedDeviceId(newDeviceId);
                  sendSpotifyCommand("TRANSFER_PLAYBACK", newDeviceId);
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
                {availableDevices.length === 0 && !devicesLoading && !devicesError && (
                  <MenuItem value="" disabled>
                    No devices found
                  </MenuItem>
                )}
                {availableDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name} ({device.type}) {device.is_active ? "(Active)" : ""}
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
                }}
                onClick={() => sendSpotifyCommand("PREVIOUS")}
                disabled={connectionStatus !== "Connected"}
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
                  color: "white",
                }}
                onClick={() =>
                  sendSpotifyCommand(spotifyData.isPlaying ? "PAUSE" : "PLAY")
                }
                disabled={connectionStatus !== "Connected"}
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
                }}
                onClick={() => sendSpotifyCommand("NEXT")}
                disabled={connectionStatus !== "Connected"}
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
          <Button
            variant="contained"
            color="success"
            onClick={handleSpotifyLogin}
            sx={{ width: "100%", mt: 2 }}
          >
            Login with Spotify
          </Button>
        )}
      </Card>
    </Container>
  );
};

export default ControlPanel;
