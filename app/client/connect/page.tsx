// File: app/client/connect/page.tsx (Web Bluetooth Connection UI)
/**
 * Web Bluetooth Connection Client: This page is used by the athlete (on a supported browser)
 * to connect the physical heart rate device and begin streaming data.
 */
"use client";
import { Bluetooth, HeartBroken, LinkOff } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
} from "@mui/material";
import React from "react";
import HeartRateZones from "../../../components/HeartRateZones";
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

  // Find the Bluetooth device's HR data (first connected device that's not the mock)
  const bluetoothHrData =
    hrmData.find(
      (user) =>
        user.name && user.name !== "Mock User" && user.name !== "New User"
    ) || hrmData[0]; // Fallback to first user if no specific match
  const currentHr = bluetoothHrData?.value || 0;
  const zoneInfo = getHrZoneProps(currentHr, MAX_HR || 190);

  return (
    <Container
      maxWidth="sm"
      className="py-12 min-h-screen flex items-center justify-center bg-gray-50"
    >
      <Card className="shadow-2xl w-full p-6 text-center">
        <Bluetooth color="primary" sx={{ fontSize: 60, mb: 2 }} />
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
          startIcon={isConnected ? <LinkOff /> : <HeartBroken />}
          className="mb-4 w-full"
        >
          {isConnecting
            ? "Connecting..."
            : isConnected
            ? "Device Connected"
            : "Connect HRM via Bluetooth"}
        </Button>

        <Box
          className={`p-4 rounded-lg mt-4 ${
            isConnected ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <Typography
            variant="subtitle1"
            className="font-semibold"
            style={{ color: isConnected ? "#10b981" : "#f87171" }}
          >
            Status: {deviceStatus}
          </Typography>
          <Typography variant="caption" display="block" color="textSecondary">
            Ensure Bluetooth is enabled and the device is nearby.
          </Typography>
          {deviceStatus.includes("Failed") &&
            deviceStatus.includes("chrome://flags") && (
              <Typography
                variant="caption"
                display="block"
                className="mt-2"
                style={{ color: "#dc2626" }}
              >
                💡 Tip: Click{" "}
                <a
                  href="chrome://flags"
                  target="_blank"
                  rel="noopener noreferrer"
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
            color="textSecondary"
            className="mt-2"
          >
            Max HR (reported / configured): {MAX_HR ?? "—"}
          </Typography>
        </Box>

        {/* Live Heart Rate Display */}
        {isConnected && currentHr > 0 && (
          <Card
            sx={{
              my: 3,
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
                {currentHr}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {currentHr} BPM
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                {zoneInfo.zone} • {Math.round(zoneInfo.percentage)}%
              </Typography>
            </CardContent>
          </Card>
        )}

        {isConnected && MAX_HR && <HeartRateZones maxHr={MAX_HR} />}

        <Typography variant="caption" className="mt-4 block text-gray-500">
          Your data will be streamed to the unified server at 127.0.0.1:3000.
        </Typography>
      </Card>
    </Container>
  );
};

export default BluetoothClient;
