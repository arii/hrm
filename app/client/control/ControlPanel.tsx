// File: app/client/control/ControlPanel.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
"use client";
import Head from "next/head";
import {
  Add,
  FitnessCenter,
  MusicNote,
  Pause,
  PlayArrow,
  Remove, // New import for stepper
  SkipNext,
  SkipPrevious,
  Stop,
  Timer,
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
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import useVolumePreference, {
  clampVolume,
} from "../../../hooks/useVolumePreference";
import useWebSocket from "../../../hooks/useWebSocket";
import {
  SpotifyCommandMessage,
  TimerCommandMessage,
  TimerConfigMessage,
  TimerModeCommandMessage,
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

  // Timer configuration state (only used for Tabata mode UI - not sent to server anymore)
  const [workTime, setWorkTime] = useState(() => timerData.workDuration || 20);
  const [restTime, setRestTime] = useState(() => timerData.restDuration || 10);
  const { volume, setVolume } = useVolumePreference(70);
  const lastSentVolumeRef = useRef<string | null>(null);

  // Input validation states
  const lastConfigRef = useRef({
    workDuration: timerData.workDuration,
    restDuration: timerData.restDuration,
  });

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
      setDevicesLoading(false);
      setDevicesError(null);
    }
  }, [hasSpotifyData]);

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

  useEffect(() => {
    if (
      typeof timerData.workDuration === "number" &&
      timerData.workDuration > 0
    ) {
      setWorkTime((prev) =>
        prev === timerData.workDuration ? prev : timerData.workDuration
      );
      lastConfigRef.current.workDuration = timerData.workDuration;
    }
  }, [timerData.workDuration]);

  useEffect(() => {
    if (
      typeof timerData.restDuration === "number" &&
      timerData.restDuration >= 0
    ) {
      setRestTime((prev) =>
        prev === timerData.restDuration ? prev : timerData.restDuration
      );
      lastConfigRef.current.restDuration = timerData.restDuration;
    }
  }, [timerData.restDuration]);

  const resolveTargetDeviceId = useCallback(() => {
    if (selectedDeviceId) {
      return selectedDeviceId;
    }
    const activeDevice = availableDevices.find((device) => device.is_active);
    return activeDevice?.id;
  }, [availableDevices, selectedDeviceId]);

  const sendSpotifyCommand = useCallback(
    (
      command: "PLAY" | "PAUSE" | "NEXT" | "PREVIOUS" | "TRANSFER_PLAYBACK",
      overriddenDeviceId?: string
    ) => {
      const targetDeviceId =
        overriddenDeviceId !== undefined
          ? overriddenDeviceId
          : resolveTargetDeviceId();
      const message: SpotifyCommandMessage = {
        type: "SPOTIFY_COMMAND",
        command,
        ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
      };
      sendData(message);
    },
    [resolveTargetDeviceId, sendData]
  );

  // --- Timer Commands ---
  const sendTimerCommand = useCallback(
    (command: "START" | "PAUSE" | "STOP") => {
      const message: TimerCommandMessage = {
        type: "TIMER_COMMAND",
        command,
      };
      sendData(message);
      console.log("[Control Panel] Sent timer command:", message);

      if (timerData.mode === "TABATA" || timerData.mode === "STOPWATCH") {
        if (command === "START") {
          const targetDeviceId = resolveTargetDeviceId();
          if (targetDeviceId) {
            sendSpotifyCommand("TRANSFER_PLAYBACK", targetDeviceId);
            // Give Spotify a moment to switch devices before issuing play
            window.setTimeout(() => {
              sendSpotifyCommand("PLAY", targetDeviceId);
            }, 500);
          } else {
            sendSpotifyCommand("PLAY");
          }
        } else if (command === "PAUSE" || command === "STOP") {
          sendSpotifyCommand("PAUSE");
        }
      }
    },
    [resolveTargetDeviceId, sendData, sendSpotifyCommand, timerData.mode]
  );

  // --- Mode Switching ---
  const sendModeCommand = (mode: "TABATA" | "STOPWATCH") => {
    const message: TimerModeCommandMessage = {
      type: "SET_MODE",
      mode,
    };
    sendData(message);
    console.log("[Control Panel] Sent mode command:", message);
  };

  const sendConfigMessage = useCallback(
    (config: { workDuration: number; restDuration: number }) => {
      const message: TimerConfigMessage = {
        type: "TIMER_CONFIG",
        workDuration: config.workDuration,
        restDuration: config.restDuration,
      };
      sendData(message);
      console.log("[Control Panel] Sent timer config:", message);
    },
    [sendData]
  );

  useEffect(() => {
    if (connectionStatus !== "Connected") {
      return;
    }

    const normalized = {
      workDuration: workTime,
      restDuration: restTime,
    };

    if (
      lastConfigRef.current.workDuration === normalized.workDuration &&
      lastConfigRef.current.restDuration === normalized.restDuration
    ) {
      return;
    }

    lastConfigRef.current = normalized;
    sendConfigMessage(normalized);
  }, [connectionStatus, workTime, restTime, sendConfigMessage]);

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== "Connected") return;
      const sanitized = clampVolume(value);
      const targetDeviceId = resolveTargetDeviceId();
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
    [connectionStatus, resolveTargetDeviceId, sendData]
  );

  useEffect(() => {
    sendVolumeCommand(volume);
  }, [volume, sendVolumeCommand]);

  useEffect(() => {
    if (connectionStatus !== "Connected") {
      lastSentVolumeRef.current = null;
    }
  }, [connectionStatus]);

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
    <>
      <Head>
        <title>HRM Control Panel</title>
        <meta name="description" content="Heart Rate Monitor Control Panel - Timer and Spotify Controls" />
      </Head>
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
            {/* Timer Mode Selector */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  color: "white",
                  fontWeight: "medium",
                  mb: 1.5,
                  textAlign: "center",
                }}
              >
                Timer Mode
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant={timerData.mode === "TABATA" ? "contained" : "outlined"}
                  onClick={() => sendModeCommand("TABATA")}
                  disabled={timerData.isRunning}
                  startIcon={<FitnessCenter />}
                  sx={{
                    flex: 1,
                    color: timerData.mode === "TABATA" ? "white" : "#EF4444",
                    backgroundColor:
                      timerData.mode === "TABATA" ? "#EF4444" : "transparent",
                    borderColor: "#EF4444",
                    "&:hover": {
                      backgroundColor:
                        timerData.mode === "TABATA"
                          ? "#DC2626"
                          : "rgba(239, 68, 68, 0.1)",
                      borderColor: "#DC2626",
                    },
                  }}
                >
                  Tabata
                </Button>
                <Button
                  variant={
                    timerData.mode === "STOPWATCH" ? "contained" : "outlined"
                  }
                  onClick={() => sendModeCommand("STOPWATCH")}
                  disabled={timerData.isRunning}
                  startIcon={<Timer />}
                  sx={{
                    flex: 1,
                    color: timerData.mode === "STOPWATCH" ? "white" : "#EF4444",
                    backgroundColor:
                      timerData.mode === "STOPWATCH" ? "#EF4444" : "transparent",
                    borderColor: "#EF4444",
                    "&:hover": {
                      backgroundColor:
                        timerData.mode === "STOPWATCH"
                          ? "#DC2626"
                          : "rgba(239, 68, 68, 0.1)",
                      borderColor: "#DC2626",
                    },
                  }}
                >
                  Stopwatch
                </Button>
              </Stack>
            </Box>

            {/* Timer Status */}
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Typography variant="h6" sx={{ color: "white", mb: 1 }}>
                {timerData.isRunning ? "Timer Running" : "Timer Stopped"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#EF4444" }}>
                {timerData.currentPhase}{" "}
                {timerData.mode === "TABATA" &&
                  timerData.cycle > 0 &&
                  `• Cycle ${timerData.cycle}/${timerData.totalCycles}`}
              </Typography>
            </Box>

            {/* Timer Configuration Controls - Only show for Tabata */}
            {timerData.mode === "TABATA" && (
              <Stack spacing={4} sx={{ mb: 4 }}>
                {/* Work Duration Stepper */}
                <Box>
                  <Typography
                    sx={{ color: "white", fontWeight: "medium", mb: 2 }}
                  >
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
                      onClick={() => setWorkTime((prev) => Math.max(5, prev - 5))}
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
                    <TextField
                      type="number"
                      value={workTime}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setWorkTime(Math.max(5, val));
                      }}
                      inputProps={{
                        min: 0,
                        step: 5,
                        style: { textAlign: "center" },
                      }}
                      sx={{
                        width: "120px",
                        "& .MuiInputBase-input": {
                          color: "#EF4444",
                          fontWeight: "bold",
                          fontSize: "3rem",
                          textAlign: "center",
                          padding: "8px",
                        },
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": {
                            borderColor: "#EF4444",
                          },
                          "&:hover fieldset": {
                            borderColor: "#DC2626",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#EF4444",
                          },
                        },
                      }}
                      aria-label="Work duration in seconds"
                    />
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
                  <Typography
                    sx={{ color: "white", fontWeight: "medium", mb: 2 }}
                  >
                    Rest Duration (seconds)
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={3}
                  >
                    <IconButton
                      color="primary"
                      onClick={() => setRestTime((prev) => Math.max(0, prev - 5))}
                      aria-label="Decrease rest duration"
                      sx={{
                        backgroundColor: "grey.700",
                        color: "white",
                        "&:hover": { backgroundColor: "grey.600" },
                        p: 2,
                      }}
                    >
                      <Remove fontSize="large" />
                    </IconButton>
                    <TextField
                      type="number"
                      value={restTime}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setRestTime(Math.max(0, val));
                      }}
                      inputProps={{
                        min: 0,
                        step: 5,
                        style: { textAlign: "center" },
                      }}
                      sx={{
                        width: "120px",
                        "& .MuiInputBase-input": {
                          color: "#22C55E",
                          fontWeight: "bold",
                          fontSize: "3rem",
                          textAlign: "center",
                          padding: "8px",
                        },
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": {
                            borderColor: "#22C55E",
                          },
                          "&:hover fieldset": {
                            borderColor: "#16A34A",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#22C55E",
                          },
                        },
                      }}
                      aria-label="Rest duration in seconds"
                    />
                    <IconButton
                      color="primary"
                      onClick={() => setRestTime((prev) => prev + 5)}
                      aria-label="Increase rest duration"
                      sx={{
                        backgroundColor: "grey.700",
                        color: "white",
                        "&:hover": { backgroundColor: "grey.600" },
                        p: 2,
                      }}
                    >
                      <Add fontSize="large" />
                    </IconButton>
                  </Stack>
                </Box>
              </Stack>
            )}

            {/* Timer Control Buttons */}
            <Stack direction="row" spacing={3} sx={{ mt: 4 }}>
              {" "}
              {/* Increased spacing and mt */}
              <Button
                variant="contained"
                color="success"
                onClick={() => sendTimerCommand("START")}
                disabled={connectionStatus !== "Connected"}
                sx={{ flex: 1, fontWeight: "bold", py: 1.5 }} // Increased padding
                startIcon={<PlayArrow fontSize="large" />}
              >
                START
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => sendTimerCommand("STOP")}
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
            mb: 3,
            backgroundColor: "grey.800",
            color: "white",
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                color: "#1DB954",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MusicNote sx={{ mr: 1 }} /> Spotify
            </Typography>

            {hasSpotifyData ? (
              <>
                <Box sx={{ textAlign: "center", mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                    {spotifyData.trackName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "grey.400" }}>
                    {spotifyData.artist}
                  </Typography>
                </Box>

                {/* Playback Controls */}
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  sx={{ mb: 2 }}
                >
                  <IconButton
                    onClick={() => sendSpotifyCommand("PREVIOUS")}
                    disabled={connectionStatus !== "Connected"}
                    sx={{
                      color: "white",
                      "&:hover": { backgroundColor: "grey.700" },
                    }}
                  >
                    <SkipPrevious />
                  </IconButton>
                  <IconButton
                    onClick={() =>
                      sendSpotifyCommand(spotifyData.isPlaying ? "PAUSE" : "PLAY")
                    }
                    disabled={connectionStatus !== "Connected"}
                    sx={{
                      color: "white",
                      backgroundColor: "#1DB954",
                      "&:hover": { backgroundColor: "#169944" },
                    }}
                  >
                    {spotifyData.isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>
                  <IconButton
                    onClick={() => sendSpotifyCommand("NEXT")}
                    disabled={connectionStatus !== "Connected"}
                    sx={{
                      color: "white",
                      "&:hover": { backgroundColor: "grey.700" },
                    }}
                  >
                    <SkipNext />
                  </IconButton>
                </Stack>

                {/* Volume Control - Compact */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <VolumeUp sx={{ color: "grey.400", fontSize: 20 }} />
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
                      color: "#1DB954",
                      "& .MuiSlider-thumb": { backgroundColor: "white" },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: "grey.400", minWidth: "3ch" }}
                  >
                    {volume}
                  </Typography>
                </Stack>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Dashboard to Select Device
                  </Button>
                </Box>
              </>
            ) : (
              <Typography
                variant="body2"
                sx={{ color: "grey.400", textAlign: "center" }}
              >
                Login to Spotify on the main dashboard
              </Typography>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default ControlPanel;