// File: app/client/control/page.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
"use client";
import {
  MusicNote,
  Pause,
  PlayArrow,
  SkipNext,
  SkipPrevious,
  VolumeUp,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAudioPlayer } from "../../../hooks/useAudioPlayer";
import useWebSocket from "../../../hooks/useWebSocket";
import {
  SpotifyCommandMessage,
  TimerCommandMessage,
} from "../../../types/websocket";

const ControlPanel = () => {
  const { timerData, spotifyData, connectionStatus, sendData } = useWebSocket();
  const { initAudio, playSound } = useAudioPlayer();

  // Timer configuration state
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [volume, setVolume] = useState(50);

  // --- Timer Commands ---
  const _sendTimerCommand = (command: "START" | "PAUSE" | "STOP") => {
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
    command: "PLAY" | "PAUSE" | "NEXT" | "PREVIOUS"
  ) => {
    const message: SpotifyCommandMessage = { type: "SPOTIFY_COMMAND", command };
    sendData(message); // sendData now accepts the typed object
  };

  const handleSpotifyLogin = () => {
    // Trigger the NextAuth login flow
    signIn("spotify", { callbackUrl: "/client/control" });
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
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h2"
              component="div"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                color: "red",
                fontSize: { xs: "3.5rem", sm: "5rem", md: "6rem" },
              }}
            >
              {timerData.timeRemaining}
            </Typography>
            <Typography sx={{ color: "white", mt: 1 }}>
              Phase: {timerData.currentPhase || "IDLE"}
            </Typography>
          </Box>

          {/* Timer Configuration Controls */}
          <Stack spacing={3} sx={{ mb: 3 }}>
            {/* Work Duration Slider */}
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography sx={{ color: "white", fontWeight: "medium" }}>
                  Work Duration
                </Typography>
                <Typography
                  sx={{
                    color: "red",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                  }}
                >
                  {workTime}s
                </Typography>
              </Stack>
              <Slider
                value={workTime}
                onChange={(_: Event, newValue: number | number[]) =>
                  setWorkTime(newValue as number)
                }
                min={10}
                max={60}
                step={5}
                marks={[
                  { value: 10, label: "10s" },
                  { value: 30, label: "30s" },
                  { value: 60, label: "60s" },
                ]}
                valueLabelDisplay="auto"
                sx={{
                  color: "red",
                  "& .MuiSlider-thumb": { backgroundColor: "red" },
                  "& .MuiSlider-track": { backgroundColor: "red" },
                  "& .MuiSlider-rail": { backgroundColor: "grey.600" },
                }}
              />
            </Box>

            {/* Rest Duration Slider */}
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography sx={{ color: "white", fontWeight: "medium" }}>
                  Rest Duration
                </Typography>
                <Typography
                  sx={{
                    color: "red",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                  }}
                >
                  {restTime}s
                </Typography>
              </Stack>
              <Slider
                value={restTime}
                onChange={(_: Event, newValue: number | number[]) =>
                  setRestTime(newValue as number)
                }
                min={5}
                max={30}
                step={5}
                marks={[
                  { value: 5, label: "5s" },
                  { value: 10, label: "10s" },
                  { value: 30, label: "30s" },
                ]}
                valueLabelDisplay="auto"
                sx={{
                  color: "red",
                  "& .MuiSlider-thumb": { backgroundColor: "red" },
                  "& .MuiSlider-track": { backgroundColor: "red" },
                  "& .MuiSlider-rail": { backgroundColor: "grey.600" },
                }}
              />
            </Box>
          </Stack>

          {/* Timer Control Buttons */}
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="success"
              onClick={() => _sendTimerCommand("START")}
              disabled={connectionStatus !== "Connected"}
              sx={{ flex: 1, fontWeight: "bold" }}
            >
              START
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => _sendTimerCommand("PAUSE")}
              disabled={connectionStatus !== "Connected"}
              sx={{ flex: 1, fontWeight: "bold" }}
            >
              PAUSE
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => _sendTimerCommand("STOP")}
              disabled={connectionStatus !== "Connected"}
              sx={{ flex: 1, fontWeight: "bold" }}
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
          <MusicNote sx={{ mr: 1 }} /> Spotify Player
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
              >
                <SkipNext fontSize="large" />
              </IconButton>
            </Stack>

            {/* Volume Control */}
            <Box sx={{ px: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <VolumeUp sx={{ color: "grey.400" }} />
                <Slider
                  value={volume}
                  onChange={(_: Event, newValue: number | number[]) =>
                    setVolume(newValue as number)
                  }
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
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
