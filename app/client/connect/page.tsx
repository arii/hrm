// File: app/client/connect/page.tsx (Web Bluetooth Connection UI)
/**
 * Web Bluetooth Connection Client: This page is used by the athlete (on a supported browser)
 * to connect the physical heart rate device and begin streaming data.
 */
"use client";
import { Bluetooth, LinkOff } from "@mui/icons-material";
import {
  Button,
  Card,
  Container,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import React from "react";
import Link from "next/link";
import useBluetoothHRM from "../../../hooks/useBluetoothHRM";
import useWebSocket from "../../../hooks/useWebSocket";

const BluetoothClient: React.FC = () => {
  // Hook returns operations and status (names taken from current hook usage in repo)
  const { connectAndStream, deviceStatus, MAX_HR } = useBluetoothHRM();
  useWebSocket();

  const isConnected =
    typeof deviceStatus === "string" && deviceStatus.startsWith("Connected");
  const isConnecting = deviceStatus === "Connecting";

  // Find the Bluetooth device's HR data (first connected device that's not the mock)




  return (
    <Container
      maxWidth="sm"
      className="py-12 min-h-screen flex items-center justify-center bg-gray-50"
    >
      <Card className="shadow-2xl w-full p-6 text-center">
        <Bluetooth color="primary" sx={{ fontSize: 60, mb: 2 }} aria-hidden="true" />
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

        {isConnected && (
          <Button
            variant="contained"
            size="large"
            color="success"
            component={Link}
            href="/"
            className="mt-4 w-full"
          >
            Start My Workout Dashboard
          </Button>
        )}

        {/* Connection Status Alert */}
        <Alert
          severity={isConnected ? "success" : "error"}
          sx={{ mt: 2, mb: 2 }}
        >
          <Typography variant="subtitle1" className="font-semibold">
            Status: {deviceStatus}
          </Typography>
          <Typography variant="caption" display="block">
            Ensure Bluetooth is enabled and the device is nearby.
          </Typography>
          {deviceStatus.includes("Failed") &&
            deviceStatus.includes("chrome://flags") && (
              <Typography
                variant="caption"
                display="block"
                sx={{ mt: 1 }}
              >
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
          <Typography
            variant="caption"
            display="block"
            sx={{ mt: 1 }}
          >
            Max HR (reported / configured): {MAX_HR ?? "—"}
          </Typography>
        </Alert>



        <Typography variant="caption" className="mt-4 block text-gray-500">
          Your data will be streamed to the unified server at 127.0.0.1:3000.
        </Typography>
      </Card>
    </Container>
  );
};

export default BluetoothClient;
