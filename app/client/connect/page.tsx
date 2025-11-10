// File: app/client/connect/page.tsx (Web Bluetooth Connection UI)
/**
 * Web Bluetooth Connection Client: This page is used by the athlete (on a supported browser)
 * to connect the physical heart rate device and begin streaming data.
 */
"use client";
import { Bluetooth, LinkOff } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from "@mui/material";

import React, { useState } from "react";
import useBluetoothHRM from "../../../hooks/useBluetoothHRM";
import useWebSocket from "../../../hooks/useWebSocket";
import { getHrZoneProps } from "../../../utils/visualization";
import HrTile from "../../../components/HrTile";

const BluetoothClient: React.FC = () => {
  // User info state
  const [userName, setUserName] = useState("");
  const [userAge, setUserAge] = useState("");
  
  // Hook returns operations and status (names taken from current hook usage in repo)
  const { connectAndStream, deviceStatus, MAX_HR } = useBluetoothHRM(userName, userAge);
  const { hrmData, connectionStatus, sendData: _sendData } = useWebSocket();
  


  const isConnected =
    typeof deviceStatus === "string" && deviceStatus.startsWith("Connected");
  const isConnecting = deviceStatus === "Connecting";

  // Get the current user's heart rate data from any active source
  const activeHrmData = hrmData.filter(data => data.value > 0);
  const myHrmData = activeHrmData.length > 0 ? activeHrmData[0] : hrmData[0];
  const currentBpm = myHrmData?.value || 0;
  // Calculate max HR based on user's age if available, otherwise use default
  const ageNumber = parseInt(userAge) || myHrmData?.age || 30;
  const calculatedMaxHr = ageNumber ? 220 - ageNumber : MAX_HR;
  const maxHr = myHrmData?.maxHr || calculatedMaxHr;
  const hrZone = getHrZoneProps(currentBpm, maxHr);
  const percentMax = hrZone.percentage;
  


  return (
    <Container
      maxWidth="sm"
      className="py-12 min-h-screen flex items-center justify-center bg-gray-50"
    >
      <Card className="shadow-2xl w-full p-6 text-center">
        <Bluetooth
          color="primary"
          sx={{ fontSize: 60, mb: 2 }}
          aria-hidden="true"
        />
        <Typography variant="h5" component="h1" className="font-bold mb-2">
          HRM Device Connector
        </Typography>
        <Typography variant="body1" color="textSecondary" className="mb-6">
          Connect your Bluetooth Heart Rate Monitor to start streaming live data
          to the dashboard.
        </Typography>

        {/* User Info Inputs */}
        <Box sx={{ mb: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter your name"
          />
          <TextField
            label="Age"
            type="number"
            value={userAge}
            onChange={(e) => setUserAge(e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Enter your age"
            inputProps={{ min: 1, max: 120 }}
          />
        </Box>

        <Button
          variant="contained"
          size="large"
          color={isConnected ? "error" : "primary"}
          onClick={connectAndStream}
          disabled={isConnecting}
          startIcon={
            isConnecting ? (
              <CircularProgress size={24} color="inherit" />
            ) : isConnected ? (
              <LinkOff aria-hidden="true" />
            ) : (
              <Bluetooth aria-hidden="true" />
            )
          }
          className="mb-4 w-full"
        >
          {isConnecting
            ? "Connecting..."
            : isConnected
            ? "Device Connected"
            : "Connect HRM via Bluetooth"}
        </Button>

        {/* Heart Rate Display - shows when there's data */}
        {currentBpm > 0 && (
          <Box sx={{ mt: 3, mb: 2 }}>
            <HrTile
              name={userName || myHrmData?.name || "Heart Rate Monitor"}
              bpm={currentBpm}
              percentMax={percentMax}
              background={hrZone.backgroundColor}
            />
          </Box>
        )}



        {/* Connection Status Alert */}
        <Alert
          severity={isConnected ? "success" : "info"}
          sx={{ mt: 2, mb: 2 }}
        >
          <Typography variant="subtitle1" className="font-semibold">
            Status: {deviceStatus}
          </Typography>
          {isConnected && currentBpm > 0 && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              ✅ Streaming live data to dashboard
            </Typography>
          )}
          {!isConnected && (
            <Typography variant="caption" display="block">
              Ensure Bluetooth is enabled and the device is nearby.
            </Typography>
          )}
          {deviceStatus.includes("Failed") &&
            deviceStatus.includes("chrome://flags") && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                💡 Tip: Click{" "}
                <a
                  href="chrome://flags"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Chrome Flags in new tab"
                  style={{
                    color: "#0ea5e9",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  here
                </a>{" "}
                to enable Web Bluetooth, search &quot;Web Bluetooth&quot;, then
                restart the browser.
              </Typography>
            )}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Max HR: {maxHr} BPM
          </Typography>
        </Alert>

        <Typography variant="caption" className="mt-4 block text-gray-500">
          Keep this page open to stream data to the dashboard.
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: "center" }}>
          WebSocket: {connectionStatus}
        </Typography>
        

        

      </Card>
    </Container>
  );
};

export default BluetoothClient;
