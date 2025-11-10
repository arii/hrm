// File: app/client/connect/page.tsx (Web Bluetooth Connection UI)
/**
 * Web Bluetooth Connection Client: This page is used by the athlete (on a supported browser)
 * to connect the physical heart rate device and begin streaming data.
 */
"use client";
import { Bluetooth, LinkOff } from "@mui/icons-material";
import {
  Alert,
  Button,
  Card,
  CircularProgress,
  Container,
  Typography,
} from "@mui/material";
import Link from "next/link";
import React from "react";
import useBluetoothHRM from "../../../hooks/useBluetoothHRM";
import useWebSocket from "../../../hooks/useWebSocket";
import { getHrZoneProps } from "../../../utils/visualization";

const BluetoothClient: React.FC = () => {
  // Hook returns operations and status (names taken from current hook usage in repo)
  const { connectAndStream, deviceStatus, MAX_HR } = useBluetoothHRM();
  const { hrmData } = useWebSocket();

  const isConnected =
    typeof deviceStatus === "string" && deviceStatus.startsWith("Connected");
  const isConnecting = deviceStatus === "Connecting";

  // Get the current user's heart rate data from the most recent active connection
  const myHrmData = hrmData.find((data) => data.value > 0) || hrmData[0];
  const currentBpm = myHrmData?.value || 0;
  const maxHr = myHrmData?.maxHr || MAX_HR;
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

        {/* Heart Rate Display - shows when connected and streaming */}
        {isConnected && currentBpm > 0 && (
          <Card
            sx={{
              mt: 3,
              mb: 2,
              p: 3,
              backgroundColor: hrZone.backgroundColor,
              color: "white",
              textAlign: "center",
            }}
          >
            <Typography
              variant="h3"
              component="div"
              sx={{ fontWeight: "bold", mb: 1 }}
            >
              {currentBpm} BPM
            </Typography>
            <Typography variant="h5" component="div" sx={{ mb: 1 }}>
              {percentMax}%
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {hrZone.zone}
            </Typography>
          </Card>
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
      </Card>
    </Container>
  );
};

export default BluetoothClient;
