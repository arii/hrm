// File: app/client/mock/page.tsx (HRM Mock Client - Test Input UI)
/**
 * HRM Mock Client: Provides a simple interface for developers/testers to simulate
 * streaming heart rate data without needing a physical Web Bluetooth device.
 */
'use client';
import React, { useState, useCallback } from 'react';
import { Container, Card, CardContent, Typography, Button, TextField, Box } from '@mui/material';
import { Science, HeartBroken } from '@mui/icons-material';
import useWebSocket from '../../../hooks/useWebSocket';
import { HrmInputMessage } from '../../../types/websocket';

const MockClient: React.FC = () => {
    // Note: sendData accepts the typed object
    const { sendData, connectionStatus } = useWebSocket(); 
    const [hrValue, setHrValue] = useState(100);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

    const isStreaming = intervalId !== null;
    const MAX_HR_DEFAULT = 185;

    // Function to send a single HR data packet
    const sendHrPacket = useCallback((hr: number) => {
        const message: HrmInputMessage = {
            type: 'HRM_INPUT',
            data: {
                value: hr,
                maxHr: MAX_HR_DEFAULT,
            }
        };
        // sendData is called with the typed object, which is stringified inside the hook
        sendData(message); 
    }, [sendData]);

    // Function to start streaming data
    const startStreaming = () => {
        if (isStreaming || connectionStatus !== 'Connected') return;

        // Immediately send the current value
        sendHrPacket(hrValue);

        // Set up interval for continuous streaming (e.g., every 2 seconds)
        const id = setInterval(() => {
            // Simulate minor fluctuation (+/- 2 BPM)
            const fluctuatedHr = Math.max(70, hrValue + Math.floor(Math.random() * 5) - 2);
            setHrValue(fluctuatedHr);
            sendHrPacket(fluctuatedHr);
        }, 2000);

        setIntervalId(id);
    };

    // Function to stop streaming
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
            sendHrPacket(value); // Send manual update immediately
        }
    };

    return (
        <Container maxWidth="sm" className="py-12 min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="shadow-2xl w-full p-6 text-center">
                <Science color="primary" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" component="h1" className="font-bold mb-2">
                    HRM Mock Streamer
                </Typography>
                <Typography variant="body1" color="textSecondary" className="mb-6">
                    Simulate heart rate data streaming to the dashboard for testing.
                </Typography>

                <TextField
                    label="Current BPM"
                    type="number"
                    value={hrValue}
                    onChange={handleValueChange}
                    variant="outlined"
                    fullWidth
                    size="large"
                    disabled={isStreaming}
                    className="mb-4"
                />

                <Typography variant="caption" display="block" color="textSecondary" className="mb-4">
                    Streaming Rate: Every 2 seconds (with slight fluctuation)
                </Typography>

                <Button
                    variant="contained"
                    size="large"
                    color={isStreaming ? 'error' : 'primary'}
                    onClick={isStreaming ? stopStreaming : startStreaming}
                    disabled={connectionStatus !== 'Connected'}
                    startIcon={<HeartBroken />}
                    className="mb-4 w-full"
                >
                    {isStreaming ? `STOP Streaming HR: ${hrValue} BPM` : 'START Continuous Stream'}
                </Button>

                <Box className={`p-3 rounded-lg mt-4 ${connectionStatus === 'Connected' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <Typography variant="subtitle1" className="font-semibold">
                        Server Status: {connectionStatus}
                    </Typography>
                </Box>
            </Card>
        </Container>
    );
};

export default MockClient;