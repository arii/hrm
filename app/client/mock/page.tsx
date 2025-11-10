// File: app/client/mock/page.tsx (HRM Mock Client - Test Input UI)
/**
 * HRM Mock Client: Provides a simple interface for developers/testers to simulate
 * streaming heart rate data without needing a physical Web Bluetooth device.
 */
"use client";
import { PlayArrow, Stop } from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Container,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useState } from "react";
import useWebSocket from "../../../hooks/useWebSocket";
import { HrmInputMessage } from "../../../types/websocket";
import { ZONE_COLORS, getHrZoneProps } from "../../../utils/visualization";

const MockClient = () => {
  const { sendData, connectionStatus } = useWebSocket();
  const [hrValue, setHrValue] = useState(100);
  const [name, setName] = useState("Mock User");
  const [age, setAge] = useState(30);
  const [deviceId, setDeviceId] = useState("1234");
  const [addNoise, setAddNoise] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const isStreaming = intervalId !== null;
  const MAX_HR_DEFAULT = 220 - age;
  const isConnected = connectionStatus === "Connected";

  // Get zone info for live display
  const zoneInfo = getHrZoneProps(hrValue, MAX_HR_DEFAULT);

  const sendHrPacket = useCallback(
    (hr: number) => {
      const message: HrmInputMessage = {
        type: "HRM_INPUT",
        data: {
          value: hr,
          maxHr: MAX_HR_DEFAULT,
          name: name,
          age: age,
        },
      };
      console.log("[Mock] Sending HRM_INPUT:", message);
      sendData(message);
    },
    [sendData, name, age, MAX_HR_DEFAULT]
  );

  const startStreaming = () => {
    if (isStreaming || !isConnected) return;
    sendHrPacket(hrValue);
    const id = setInterval(() => {
      const noiseAmount = addNoise ? Math.floor(Math.random() * 11) - 5 : 0;
      const fluctuatedHr = Math.max(70, hrValue + noiseAmount);
      setHrValue(fluctuatedHr);
      sendHrPacket(fluctuatedHr);
    }, 2000);
    setIntervalId(id);
  };

  const stopStreaming = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setHrValue(isNaN(value) ? 0 : value);
    if (!isStreaming) {
      sendHrPacket(value);
    }
  };

  const setHrByZone = (zone: "grey" | "blue" | "green" | "yellow" | "red") => {
    const zones = {
      grey: 95,
      blue: 115,
      green: 135,
      yellow: 155,
      red: 175,
    };
    const newHr = zones[zone];
    setHrValue(newHr);
    if (!isStreaming) {
      sendHrPacket(newHr);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        py: 4,
      }}
    >
      <Paper elevation={3} sx={{ width: "100%", p: 4 }}>
        {/* Header with Icon */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mb: 2,
              bgcolor: "primary.main",
              fontSize: "2rem",
            }}
          >
            💓
          </Avatar>
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            HRM Mock Streamer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Simulate heart rate data for testing
          </Typography>
        </Box>

        {/* Server Status Chip */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <Chip
            label={connectionStatus}
            color={isConnected ? "success" : "error"}
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
        </Box>

        {/* Live Heart Rate Display Card */}
        <Card
          sx={{
            mb: 4,
            background: `linear-gradient(135deg, ${zoneInfo.progressColor} 0%, ${zoneInfo.progressColor}dd 100%)`,
            color: "white",
            textAlign: "center",
          }}
          elevation={4}
        >
          <CardContent sx={{ py: 3 }}>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Heart Rate
            </Typography>
            <Typography
              variant="h1"
              sx={{
                fontSize: "4rem",
                fontWeight: "bold",
                lineHeight: 1,
                my: 1,
              }}
            >
              {hrValue}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {hrValue} BPM
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              {zoneInfo.zone} • {Math.round(zoneInfo.percentage)}%
            </Typography>
          </CardContent>
        </Card>

        {/* Form Stack */}
        <Stack spacing={3} component="form">
          {/* User Details Grid */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 2, fontWeight: "bold", color: "text.secondary" }}
            >
              User Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField
                  label="User Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value, 10) || 30)}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Device ID */}
          <TextField
            label="Device ID"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
          />

          {/* BPM Input */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: "bold", color: "text.secondary" }}
            >
              Current BPM: {hrValue}
            </Typography>
            <TextField
              type="number"
              value={hrValue}
              onChange={handleValueChange}
              fullWidth
              variant="outlined"
              size="small"
              disabled={isStreaming}
              inputProps={{ min: 60, max: 200 }}
            />
          </Box>

          {/* Zone Selection */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 2, fontWeight: "bold", color: "text.secondary" }}
            >
              Select Heart Rate Zone
            </Typography>
            <ButtonGroup variant="outlined" fullWidth size="small">
              <Button
                onClick={() => setHrByZone("grey")}
                sx={{
                  backgroundColor: ZONE_COLORS.grey,
                  color: "white",
                  "&:hover": {
                    backgroundColor: ZONE_COLORS.grey,
                    opacity: 0.8,
                  },
                }}
              >
                Zone 1
              </Button>
              <Button
                onClick={() => setHrByZone("blue")}
                sx={{
                  backgroundColor: ZONE_COLORS.blue,
                  color: "white",
                  "&:hover": {
                    backgroundColor: ZONE_COLORS.blue,
                    opacity: 0.8,
                  },
                }}
              >
                Zone 2
              </Button>
              <Button
                onClick={() => setHrByZone("green")}
                sx={{
                  backgroundColor: ZONE_COLORS.green,
                  color: "white",
                  "&:hover": {
                    backgroundColor: ZONE_COLORS.green,
                    opacity: 0.8,
                  },
                }}
              >
                Zone 3
              </Button>
              <Button
                onClick={() => setHrByZone("yellow")}
                sx={{
                  backgroundColor: ZONE_COLORS.yellow,
                  color: "black",
                  "&:hover": {
                    backgroundColor: ZONE_COLORS.yellow,
                    opacity: 0.8,
                  },
                }}
              >
                Zone 4
              </Button>
              <Button
                onClick={() => setHrByZone("red")}
                sx={{
                  backgroundColor: ZONE_COLORS.red,
                  color: "white",
                  "&:hover": { backgroundColor: ZONE_COLORS.red, opacity: 0.8 },
                }}
              >
                Zone 5
              </Button>
            </ButtonGroup>
          </Box>

          {/* Add Noise Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={addNoise}
                onChange={(e) => setAddNoise(e.target.checked)}
                disabled={isStreaming}
              />
            }
            label="Add Random Noise (±5 BPM)"
            sx={{ justifyContent: "space-between" }}
          />

          {/* Primary Action Button */}
          <Button
            variant="contained"
            size="large"
            color={isStreaming ? "error" : "primary"}
            onClick={isStreaming ? stopStreaming : startStreaming}
            disabled={!isConnected}
            startIcon={isStreaming ? <Stop /> : <PlayArrow />}
            sx={{ py: 1.5, fontWeight: "bold", fontSize: "1rem" }}
          >
            {isStreaming
              ? `STOP Streaming (${hrValue} BPM)`
              : "START Continuous Stream"}
          </Button>

          {/* Connection Notice */}
          {!isConnected && (
            <Typography
              variant="body2"
              color="error"
              sx={{ textAlign: "center", fontStyle: "italic" }}
            >
              Waiting for server connection...
            </Typography>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default MockClient;
