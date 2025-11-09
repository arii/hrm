// File: app/client/control/page.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
'use client';
import React, { useEffect } from 'react';
import { Container, Card, CardContent, Typography, Button, Box, IconButton, Stack } from '@mui/material';
import { PlayArrow, Pause, Stop, SkipNext, SkipPrevious, MusicNote, Timer } from '@mui/icons-material';
import useWebSocket from '../../../hooks/useWebSocket';
import { useAudioPlayer } from '../../../hooks/useAudioPlayer';
import { signIn } from 'next-auth/react';
import { getTimerProps } from '../../../utils/visualization';
import { TimerCommandMessage, SpotifyCommandMessage } from '../../../types/websocket';

const ControlPanel: React.FC = () => {
    const { timerData, spotifyData, connectionStatus, sendData } = useWebSocket();
    const { initAudio, playSound } = useAudioPlayer();

    const timerProps = getTimerProps(timerData.currentPhase);
    
    // --- Timer Commands ---
    const sendTimerCommand = (command: 'START' | 'PAUSE' | 'STOP') => {
        if (command === 'START') {
            initAudio(); // Initialize audio on user interaction
        }
        const message: TimerCommandMessage = { type: 'TIMER_COMMAND', command };
        sendData(message); // sendData now accepts the typed object
    };

    // --- Spotify Commands ---
    const sendSpotifyCommand = (command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS') => {
        const message: SpotifyCommandMessage = { type: 'SPOTIFY_COMMAND', command };
        sendData(message); // sendData now accepts the typed object
    };

    const handleSpotifyLogin = () => {
        // Trigger the NextAuth login flow
        signIn('spotify', { callbackUrl: '/client/control' });
    };

    // Check if we have received a non-default song title
    const spotifyLoggedIn = spotifyData.trackName !== 'Awaiting Login...';

    // Handle incoming sound commands from the server
    useEffect(() => {
        if (timerData.soundToPlay) {
            playSound(timerData.soundToPlay);
        }
    }, [timerData.soundToPlay, playSound]);

    return (
        <Container maxWidth="xs" className="py-8 min-h-screen bg-gray-100">
            <Typography variant="h5" component="h1" className="font-bold text-center mb-6 text-gray-800">
                Workout Control Center
            </Typography>

            {/* Status Indicator */}
            <Box className="text-center mb-6">
                <Typography variant="caption">Server Status:</Typography>
                <span className={`inline-flex items-center ml-2 px-3 py-0.5 rounded-full text-sm font-medium ${connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    {connectionStatus}
                </span>
            </Box>

            {/* 1. Tabata Timer Controls */}
            <Card className={`shadow-lg p-4 mb-6 ${timerProps.backgroundColor}`}>
                <Typography variant="h6" className="flex items-center font-semibold mb-3 text-gray-700">
                    <Timer className="mr-2" /> Tabata Timer
                </Typography>
                <Box className="text-center mb-3">
                    <Typography variant="h4" className="font-extrabold" style={{ color: timerProps.progressColor }}>
                        {timerData.timeRemaining}s
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        {timerData.currentPhase} ({timerData.cycle}/{timerData.totalCycles})
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} justifyContent="center" className="mt-4">
                    <IconButton 
                        size="large" 
                        color="success" 
                        onClick={() => sendTimerCommand('START')} 
                        disabled={timerData.isRunning || connectionStatus !== 'Connected'}
                        className="bg-green-100 hover:bg-green-200"
                    >
                        <PlayArrow fontSize="inherit" />
                    </IconButton>
                    <IconButton 
                        size="large" 
                        color="warning" 
                        onClick={() => sendTimerCommand('PAUSE')} 
                        disabled={!timerData.isRunning || connectionStatus !== 'Connected'}
                        className="bg-yellow-100 hover:bg-yellow-200"
                    >
                        <Pause fontSize="inherit" />
                    </IconButton>
                    <IconButton 
                        size="large" 
                        color="error" 
                        onClick={() => sendTimerCommand('STOP')} 
                        disabled={timerData.currentPhase === 'IDLE' || connectionStatus !== 'Connected'}
                        className="bg-red-100 hover:bg-red-200"
                    >
                        <Stop fontSize="inherit" />
                    </IconButton>
                </Stack>
            </Card>

            {/* 2. Spotify Controls */}
            <Card className="shadow-lg p-4 mb-6 bg-gray-800 text-white">
                <Typography variant="h6" className="flex items-center font-semibold mb-3 text-gray-200">
                    <MusicNote className="mr-2" /> Spotify Player
                </Typography>

                {spotifyLoggedIn ? (
                    <CardContent className="p-0">
                        <Typography variant="subtitle1" className="font-medium">
                            {spotifyData.trackName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" className="text-gray-400 mb-4">
                            by {spotifyData.artist}
                        </Typography>
                        
                        <Stack direction="row" spacing={3} justifyContent="center">
                            <IconButton 
                                size="large" 
                                className="text-white hover:bg-gray-700"
                                onClick={() => sendSpotifyCommand('PREVIOUS')}
                                disabled={connectionStatus !== 'Connected'}
                            >
                                <SkipPrevious fontSize="large" />
                            </IconButton>
                            <IconButton 
                                size="large" 
                                color="success" 
                                className="bg-green-500 hover:bg-green-600 text-white"
                                onClick={() => sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')}
                                disabled={connectionStatus !== 'Connected'}
                            >
                                {spotifyData.isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                            </IconButton>
                            <IconButton 
                                size="large" 
                                className="text-white hover:bg-gray-700"
                                onClick={() => sendSpotifyCommand('NEXT')}
                                disabled={connectionStatus !== 'Connected'}
                            >
                                <SkipNext fontSize="large" />
                            </IconButton>
                        </Stack>
                    </CardContent>
                ) : (
                    <Button 
                        variant="contained" 
                        color="success" 
                        onClick={handleSpotifyLogin}
                        className="w-full mt-2"
                    >
                        Login with Spotify
                    </Button>
                )}
            </Card>
        </Container>
    );
};

export default ControlPanel;