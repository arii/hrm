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
        <Container maxWidth="xs" sx={{ py: 8, minHeight: '100vh', backgroundColor: 'grey.100' }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 6, color: 'grey.800' }}>
                Workout Control Center
            </Typography>

            {/* Status Indicator */}
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography variant="caption">Server Status:</Typography>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', ml: 2, px: 1.5, py: 0.5, borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 'medium', backgroundColor: connectionStatus === 'Connected' ? 'success.main' : 'error.main', color: 'white' }}>
                    {connectionStatus}
                </Box>
            </Box>

            {/* 1. Tabata Timer Controls */}
            <Card sx={{ boxShadow: 3, p: 2, mb: 3, backgroundColor: timerProps.backgroundColor }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'semibold', mb: 1.5, color: 'grey.700' }}>
                    <Timer sx={{ mr: 1 }} /> Tabata Timer
                </Typography>
                <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'extrabold', color: timerProps.progressColor }}>
                        {timerData.timeRemaining}s
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        {timerData.currentPhase} ({timerData.cycle}/{timerData.totalCycles})
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                    <IconButton 
                        size="large" 
                        color="success" 
                        onClick={() => sendTimerCommand('START')} 
                        disabled={timerData.isRunning || connectionStatus !== 'Connected'}
                        sx={{ backgroundColor: 'success.light', '&:hover': { backgroundColor: 'success.main' } }}
                    >
                        <PlayArrow fontSize="inherit" />
                    </IconButton>
                    <IconButton 
                        size="large" 
                        color="warning" 
                        onClick={() => sendTimerCommand('PAUSE')} 
                        disabled={!timerData.isRunning || connectionStatus !== 'Connected'}
                        sx={{ backgroundColor: 'warning.light', '&:hover': { backgroundColor: 'warning.main' } }}
                    >
                        <Pause fontSize="inherit" />
                    </IconButton>
                    <IconButton 
                        size="large" 
                        color="error" 
                        onClick={() => sendTimerCommand('STOP')} 
                        disabled={timerData.currentPhase === 'IDLE' || connectionStatus !== 'Connected'}
                        sx={{ backgroundColor: 'error.light', '&:hover': { backgroundColor: 'error.main' } }}
                    >
                        <Stop fontSize="inherit" />
                    </IconButton>
                </Stack>
            </Card>

            {/* 2. Spotify Controls */}
            <Card sx={{ boxShadow: 3, p: 2, mb: 3, backgroundColor: 'grey.800', color: 'white' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'semibold', mb: 1.5, color: 'grey.200' }}>
                    <MusicNote sx={{ mr: 1 }} /> Spotify Player
                </Typography>

                {spotifyLoggedIn ? (
                    <CardContent sx={{ p: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                            {spotifyData.trackName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ color: 'grey.400', mb: 3 }}>
                            by {spotifyData.artist}
                        </Typography>
                        
                        <Stack direction="row" spacing={3} justifyContent="center">
                            <IconButton 
                                size="large" 
                                sx={{ color: 'white', '&:hover': { backgroundColor: 'grey.700' } }}
                                onClick={() => sendSpotifyCommand('PREVIOUS')}
                                disabled={connectionStatus !== 'Connected'}
                            >
                                <SkipPrevious fontSize="large" />
                            </IconButton>
                            <IconButton 
                                size="large" 
                                color="success" 
                                sx={{ backgroundColor: 'success.main', '&:hover': { backgroundColor: 'success.dark' }, color: 'white' }}
                                onClick={() => sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')}
                                disabled={connectionStatus !== 'Connected'}
                            >
                                {spotifyData.isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                            </IconButton>
                            <IconButton 
                                size="large" 
                                sx={{ color: 'white', '&:hover': { backgroundColor: 'grey.700' } }}
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
                        sx={{ width: '100%', mt: 2 }}
                    >
                        Login with Spotify
                    </Button>
                )}
            </Card>
        </Container>
    );
};

export default ControlPanel;