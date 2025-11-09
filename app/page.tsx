// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client';
import React, { useMemo } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, LinearProgress, Paper } from '@mui/material';
import { BarChart, HeartBroken, Watch, MusicNote } from '@mui/icons-material';
import useWebSocket from '../hooks/useWebSocket';
import GoogleDocViewer from '../components/GoogleDocViewer';
import { getHrZoneProps, getTimerProps } from '../utils/visualization';
import CircularProgress from '@mui/material/CircularProgress';

const MAX_HR_DEFAULT = 185;
const DOC_URL = "https://docs.google.com/document/d/e/2PACX-1vT1lA3-6r4q1gHqK2q9J2sJ4D8X1K6o5B3cQ8Yt5x4bW7X0yJ0z7w9V6mR/pub?embedded=true"; // Example URL

// Component to display the current connection status
const StatusIndicator = ({ status }) => {
    let color = 'bg-gray-400';
    if (status === 'Connected') color = 'bg-green-500';
    if (status === 'Connecting...') color = 'bg-yellow-500';

    return (
        <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${color} text-white`}>
            <span className="mr-2 text-xs">●</span> {status}
        </span>
    );
};

const Dashboard: React.FC = () => {
    const { hrmData, timerData, spotifyData, connectionStatus } = useWebSocket();
    
    // Visualization logic separation
    const hrZoneProps = useMemo(() => getHrZoneProps(hrmData.value, hrmData.maxHr || MAX_HR_DEFAULT), [hrmData]);
    const timerProps = useMemo(() => getTimerProps(timerData.currentPhase), [timerData]);
    const timerProgressValue = useMemo(() => {
        if (timerData.timeRemaining === 0 || timerData.currentPhase === 'IDLE') return 0;
        const totalDuration = timerData.currentPhase === 'WORK' ? 30 : 10;
        return (timerData.timeRemaining / totalDuration) * 100;
    }, [timerData]);


    return (
        <Container maxWidth="xl" className="py-6 min-h-screen bg-gray-50">
            <Box className="flex justify-between items-center mb-6">
                <Typography variant="h4" component="h1" className="font-bold text-gray-800">
                    Real-Time Virtual Fitness Dashboard
                </Typography>
                <StatusIndicator status={connectionStatus} />
            </Box>

            <Grid container spacing={3}>
                {/* --------------------- TOP ROW: KEY METRICS --------------------- */}
                
                {/* 1. HEART RATE MONITOR (HRM) */}
                <Grid item xs={12} md={6} lg={4}>
                    <Card className="shadow-xl h-full flex flex-col">
                        <CardContent className="flex-grow">
                            <Box className="flex items-center justify-between">
                                <Typography variant="subtitle1" color="textSecondary" className="flex items-center">
                                    <HeartBroken className="mr-1" color="error" /> LIVE HEART RATE
                                </Typography>
                                <Typography variant="caption" className="font-mono text-gray-500">
                                    Max HR: {hrmData.maxHr || MAX_HR_DEFAULT} BPM
                                </Typography>
                            </Box>

                            <Box className="mt-4 text-center">
                                {/* BPM Number */}
                                <Typography 
                                    variant="h1" 
                                    component="div" 
                                    className="font-extrabold"
                                    style={{ color: hrZoneProps.progressColor, fontSize: '5rem' }}
                                >
                                    {hrmData.value}
                                </Typography>
                                {/* Zone Name */}
                                <Box 
                                    className="inline-block px-3 py-1 rounded-full mt-2"
                                    style={{ backgroundColor: hrZoneProps.progressColor }}
                                >
                                    <Typography variant="subtitle1" className="font-bold text-white">
                                        {hrZoneProps.zone} ZONE
                                    </Typography>
                                </Box>
                                
                                {/* Progress Bar (Percentage of Max) */}
                                <Typography variant="caption" display="block" className="mt-4 text-gray-600">
                                    {hrZoneProps.percentage}% of Max HR
                                </Typography>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={hrZoneProps.percentage} 
                                    className="mt-2 h-2 rounded-full"
                                    sx={{ 
                                        '& .MuiLinearProgress-bar': { backgroundColor: hrZoneProps.progressColor },
                                        backgroundColor: '#e5e7eb',
                                    }} 
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 2. TABATA TIMER */}
                <Grid item xs={12} md={6} lg={4}>
                    <Card className={`shadow-xl h-full flex flex-col ${timerProps.backgroundColor}`}>
                        <CardContent className="flex-grow text-center">
                            <Typography variant="subtitle1" color="textSecondary" className="flex items-center justify-center mb-4">
                                <Watch className="mr-1" color={timerProps.color} /> TABATA INTERVAL
                            </Typography>
                            
                            <Box className="relative inline-flex mb-4">
                                {/* Progress Circle */}
                                <CircularProgress
                                    variant="determinate"
                                    value={timerProgressValue}
                                    size={150}
                                    thickness={4}
                                    sx={{ 
                                        color: timerProps.progressColor,
                                        transition: 'color 0.5s ease-in-out'
                                    }}
                                />
                                {/* Time Remaining Text */}
                                <Box
                                    sx={{
                                        top: 0,
                                        left: 0,
                                        bottom: 0,
                                        right: 0,
                                        position: 'absolute',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <Typography variant="h3" component="div" className="font-bold" color="textPrimary">
                                        {timerData.timeRemaining}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary" className="font-medium">
                                        SECONDS
                                    </Typography>
                                </Box>
                            </Box>
                            
                            {/* Phase Status */}
                            <Typography variant="h5" className="font-extrabold mt-3" style={{ color: timerProps.progressColor }}>
                                {timerData.currentPhase}
                            </Typography>
                            <Typography variant="subtitle2" color="textSecondary">
                                Cycle {timerData.cycle} of {timerData.totalCycles}
                            </Typography>

                            <Typography variant="caption" className="mt-4 block">
                                Control the timer via the /client/control page.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 3. SPOTIFY MUSIC STATUS */}
                <Grid item xs={12} md={12} lg={4}>
                    <Card className="shadow-xl h-full flex flex-col bg-gray-800 text-white">
                        <CardContent className="flex-grow flex flex-col justify-between">
                            <Box>
                                <Typography variant="subtitle1" className="flex items-center mb-4 text-gray-400">
                                    <MusicNote className="mr-1" /> NOW PLAYING
                                </Typography>
                                <Typography variant="h5" component="p" className="font-bold mb-1">
                                    {spotifyData.trackName}
                                </Typography>
                                <Typography variant="subtitle1" color="textSecondary" className="text-gray-400">
                                    {spotifyData.artist}
                                </Typography>
                            </Box>
                            
                            <Box className="mt-6">
                                <Typography variant="body2" className="text-gray-500">
                                    Playback Status: {spotifyData.isPlaying ? '▶️ Playing' : '⏸️ Paused'}
                                </Typography>
                                <Typography variant="caption" className="mt-1 block text-gray-600">
                                    Login required via the /client/control page to enable live updates.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* --------------------- BOTTOM ROW: DOCUMENTATION --------------------- */}

                <Grid item xs={12}>
                    <Box className="mt-4 mb-4">
                        <Typography variant="h5" component="h2" className="font-bold text-gray-800">
                            Workout Plan & Resources
                        </Typography>
                        <Typography variant="body1" color="textSecondary" className="mt-1">
                            Review the current workout plan and reference materials provided by your trainer.
                        </Typography>
                    </Box>
                </Grid>
                
                <Grid item xs={12}>
                    {/* The Google Doc Viewer component */}
                    <GoogleDocViewer
                        title="Today's Training Regimen"
                        embedUrl={DOC_URL}
                        height={600}
                    />
                </Grid>

            </Grid>

            <Box className="mt-8 text-center text-gray-500 text-sm">
                Dashboard served from unified server at 127.0.0.1:3000.
            </Box>
        </Container>
    );
};

export default Dashboard;