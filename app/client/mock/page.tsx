// File: app/client/mock/page.tsx (HRM Mock Client - Test Input UI)
/**
 * HRM Mock Client: Provides a simple interface for developers/testers to simulate
 * streaming heart rate data without needing a physical Web Bluetooth device.
 */
"use client";
import { HeartBroken, Science } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useState } from "react";
import useWebSocket from "../../../hooks/useWebSocket";
import { HrmInputMessage } from "../../../types/websocket";

const MockClient: React.FC = () => {
  const { sendData, connectionStatus } = useWebSocket();
  const [hrValue, setHrValue] = useState(100);
  const [name, setName] = useState("Mock User");
  const [age, setAge] = useState(30);
  const [deviceId, setDeviceId] = useState("1234");
  const [addNoise, setAddNoise] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const isStreaming = intervalId !== null;
  const MAX_HR_DEFAULT = 220 - age; // Use age to calculate max HR

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
      sendData(message);
    },
    [sendData, name, age, MAX_HR_DEFAULT]
  );

  const startStreaming = () => {
    if (isStreaming || connectionStatus !== "Connected") return;
    sendHrPacket(hrValue);
    const id = setInterval(() => {
      const noiseAmount = addNoise
        ? Math.floor(Math.random() * 11) - 5
        : 0; // -5 to +5 if noise enabled
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
      className="py-12 min-h-screen flex items-center justify-center bg-gray-50"
    >
      <Card className="shadow-2xl w-full p-6 text-center">
        <Science color="primary" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h5" component="h1" className="font-bold mb-2">
          HRM Mock Streamer
        </Typography>
        <Typography variant="body1" color="textSecondary" className="mb-6">
          Simulate heart rate data for testing.
        </Typography>

        <Grid container spacing={2} className="mb-4">
          <Grid item xs={8} component="div">
            <TextField
              label="User Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={4} component="div">
            <TextField
              label="Age"
              type="number"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value, 10))}
              fullWidth
            />
          </Grid>
        </Grid>

        <TextField
          label="Device ID"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          variant="outlined"
          fullWidth
          size="medium"
          className="mb-4"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={addNoise}
              onChange={(e) => setAddNoise(e.target.checked)}
              disabled={isStreaming}
            />
          }
          label="Add Noise"
          className="mb-4"
        />

        <TextField
          label="Current BPM"
          type="number"
          value={hrValue}
          onChange={handleValueChange}
          variant="outlined"
          fullWidth
          size="medium"
          disabled={isStreaming}
          className="mb-4"
        />

        <Typography
          variant="caption"
          display="block"
          color="textSecondary"
          className="mb-4"
        >
          Select a zone to set HR:
        </Typography>
        <Grid container spacing={1} className="mb-4">
          <Grid item xs component="div">
            <Button
              fullWidth
              variant="contained"
              style={{ backgroundColor: "#9E9E9E" }}
              onClick={() => setHrByZone("grey")}
            >
              Zone 1
            </Button>
          </Grid>
          <Grid item xs component="div">
            <Button
              fullWidth
              variant="contained"
              style={{ backgroundColor: "#2196F3" }}
              onClick={() => setHrByZone("blue")}
            >
              Zone 2
            </Button>
          </Grid>
          <Grid item xs component="div">
            <Button
              fullWidth
              variant="contained"
              style={{ backgroundColor: "#4CAF50" }}
              onClick={() => setHrByZone("green")}
            >
              Zone 3
            </Button>
          </Grid>
          <Grid item xs component="div">
            <Button
              fullWidth
              variant="contained"
              style={{ backgroundColor: "#FFEB3B", color: "black" }}
              onClick={() => setHrByZone("yellow")}
            >
              Zone 4
            </Button>
          </Grid>
          <Grid item xs component="div">
            <Button
              fullWidth
              variant="contained"
              style={{ backgroundColor: "#F44336" }}
              onClick={() => setHrByZone("red")}
            >
              Zone 5
            </Button>
          </Grid>
        </Grid>

        <Button
          variant="contained"
          size="large"
          color={isStreaming ? "error" : "primary"}
          onClick={isStreaming ? stopStreaming : startStreaming}
          disabled={connectionStatus !== "Connected"}
          startIcon={<HeartBroken />}
          className="mb-4 w-full"
        >
          {isStreaming
            ? `STOP Streaming HR: ${hrValue} BPM`
            : "START Continuous Stream"}
        </Button>

        <Box
          className={`p-3 rounded-lg mt-4 ${
            connectionStatus === "Connected" ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <Typography variant="subtitle1" className="font-semibold">
            Server Status: {connectionStatus}
          </Typography>
        </Box>
      </Card>
    </Container>
  );
};

export default MockClient;
