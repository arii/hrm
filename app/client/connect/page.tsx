// File: app/client/connect/page.tsx (Web Bluetooth Connection UI)
/**
 * Web Bluetooth Connection Client: This page is used by the athlete (on a supported browser)
 * to connect the physical heart rate device and begin streaming data.
 */
'use client';
import React from 'react';
import { Container, Card, Typography, Button, Box } from '@mui/material';
import { Bluetooth, HeartBroken, LinkOff } from '@mui/icons-material';
import useBluetoothHRM from '../../../hooks/useBluetoothHRM';

const BluetoothClient: React.FC = () => {
    // Hook returns operations and status (names taken from current hook usage in repo)
    const { connectAndStream, deviceStatus, MAX_HR } = useBluetoothHRM();

    const isConnected = typeof deviceStatus === 'string' && deviceStatus.startsWith('Connected');
    const isConnecting = deviceStatus === 'Connecting';

    return (
        <Container maxWidth="sm" className="py-12 min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="shadow-2xl w-full p-6 text-center">
                <Bluetooth color="primary" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" component="h1" className="font-bold mb-2">
                    HRM Device Connector
                </Typography>
                <Typography variant="body1" color="textSecondary" className="mb-6">
                    Connect your Bluetooth Heart Rate Monitor to start streaming live data to the dashboard.
                </Typography>

                <Button
                    variant="contained"
                    size="large"
                    color={isConnected ? 'error' : 'primary'}
                    onClick={connectAndStream}
                    disabled={isConnecting}
                    startIcon={isConnected ? <LinkOff /> : <HeartBroken />}
                    className="mb-4 w-full"
                >
                    {isConnecting
                        ? 'Connecting...'
                        : isConnected
                            ? 'Device Connected'
                            : 'Connect HRM via Bluetooth'
                    }
                </Button>

                <Box className={`p-4 rounded-lg mt-4 ${isConnected ? 'bg-green-50' : 'bg-red-50'}`}>
                    <Typography variant="subtitle1" className="font-semibold" style={{ color: isConnected ? '#10b981' : '#f87171' }}>
                        Status: {deviceStatus}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                        Ensure Bluetooth is enabled and the device is nearby.
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary" className="mt-2">
                        Max HR (reported / configured): {MAX_HR ?? '—'}
                    </Typography>
                </Box>
                
                <Typography variant="caption" className="mt-4 block text-gray-500">
                    Your data will be streamed to the unified server at 127.0.0.1:3000.
                </Typography>
            </Card>
        </Container>
    );
};

export default BluetoothClient;