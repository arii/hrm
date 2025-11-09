// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client';
import React, { useMemo } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, LinearProgress, Paper } from '@mui/material';
import { BarChart, Favorite, Watch, MusicNote } from '@mui/icons-material';
import useWebSocket from '../hooks/useWebSocket';
import GoogleDocViewer from '../components/GoogleDocViewer';
import { getHrZoneProps, getTimerProps } from '../utils/visualization';
import CircularProgress from '@mui/material/CircularProgress';

const MAX_HR_DEFAULT = 185;
const DOC_URL = "https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub"; // Example URL

// Component to display the current connection status
const StatusIndicator = ({ status }: { status: string }) => {
    const color = useMemo(() => {
        if (status === 'Connected') return 'success.main';
        if (status === 'Connecting...') return 'warning.main';
        return 'grey.400';
    }, [status]);

    return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 2, py: 0.5, borderRadius: '9999px', backgroundColor: color, color: 'white' }}>
            <Box component="span" sx={{ mr: 1, fontSize: '0.75rem' }}>●</Box>
            <Typography variant="caption" sx={{ fontWeight: 'medium' }}>{status}</Typography>
        </Box>
    );
};

const Dashboard: React.FC = () => {
    const { hrmData, timerData, spotifyData, connectionStatus } = useWebSocket();
    
    // Visualization logic separation
    const timerProps = useMemo(() => getTimerProps(timerData.currentPhase), [timerData]);
    const timerProgressValue = useMemo(() => {
        if (timerData.timeRemaining === 0 || timerData.currentPhase === 'IDLE') return 0;
        const totalDuration = timerData.currentPhase === 'WORK' ? 30 : 10;
        return (timerData.timeRemaining / totalDuration) * 100;
    }, [timerData]);


    return (
        <Container maxWidth="xl" sx={{ py: 6, minHeight: '100vh', backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'grey.800' }}>
                    Real-Time Virtual Fitness Dashboard
                </Typography>
                <StatusIndicator status={connectionStatus} />
            </Box>

            <Grid container spacing={3}>
                {/* --------------------- TOP ROW: KEY METRICS --------------------- */}
                
                {/* 1. HEART RATE MONITORS (HRM) */}
                {hrmData.map(user => {
                    const hrZoneProps = getHrZoneProps(user.value, user.maxHr || MAX_HR_DEFAULT);
                    return (
                        <Grid item xs={12} md={6} lg={4} key={user.clientId}>
                            <Card sx={{ boxShadow: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography variant="subtitle1" color="textSecondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Favorite sx={{ mr: 1, color: 'error.main' }} /> {user.name || 'LIVE HEART RATE'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'grey.500' }}>
                                            Max HR: {user.maxHr || MAX_HR_DEFAULT} BPM
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mt: 4, textAlign: 'center' }}>
                                        {/* BPM Number */}
                                        <Typography 
                                            variant="h1" 
                                            component="div" 
                                            sx={{ fontWeight: 'extrabold', color: hrZoneProps.progressColor, fontSize: '5rem' }}
                                        >
                                            {user.value}
                                        </Typography>
                                        {/* Zone Name */}
                                        <Box 
                                            sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: '9999px', mt: 2, backgroundColor: hrZoneProps.progressColor }}
                                        >
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                {hrZoneProps.zone} ZONE
                                            </Typography>
                                        </Box>
                                        
                                        {/* Progress Bar (Percentage of Max) */}
                                        <Typography variant="caption" display="block" sx={{ mt: 4, color: 'grey.600' }}>
                                            {hrZoneProps.percentage}% of Max HR
                                        </Typography>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={hrZoneProps.percentage} 
                                            sx={{ 
                                                mt: 2, height: 8, borderRadius: '9999px',
                                                '& .MuiLinearProgress-bar': { backgroundColor: hrZoneProps.progressColor },
                                                backgroundColor: 'grey.200',
                                            }} 
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}

                {/* 2. TABATA TIMER */}
                <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ boxShadow: 3, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: timerProps.backgroundColor }}>
                        <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                            <Typography variant="subtitle1" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
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
                                    }}
                                >
                                    <Typography variant="h2" component="div" className="font-extrabold" style={{ color: timerProps.progressColor }}>
                                        {timerData.timeRemaining}s
                                    </Typography>
                                </Box>
                            </Box>
                            
                            {/* Phase Status */}
                            <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 3, color: timerProps.progressColor }}>
                                {timerData.timeRemaining}s
                            </Typography>
                            <Typography variant="subtitle2" color="textSecondary">
                                Cycle {timerData.cycle} of {timerData.totalCycles}
                            </Typography>

                            <Typography variant="caption" sx={{ mt: 4, display: 'block' }}>
                                Control the timer via the /client/control page.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 3. SPOTIFY MUSIC STATUS */}
                <Grid item xs={12} md={12} lg={4}>
                    <Card sx={{ boxShadow: 3, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'grey.800', color: 'white' }}>
                        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 4, color: 'grey.400' }}>
                                    <MusicNote sx={{ mr: 1 }} /> NOW PLAYING
                                </Typography>
                                <Typography variant="h5" component="p" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    {spotifyData.trackName}
                                </Typography>
                                <Typography variant="subtitle1" color="textSecondary" sx={{ color: 'grey.400' }}>
                                    {spotifyData.artist}
                                </Typography>
                            </Box>
                            
                            <Box sx={{ mt: 6 }}>
                                <Typography variant="body2" sx={{ color: 'grey.500' }}>
                                    Playback Status: {spotifyData.isPlaying ? 'Playing' : 'Paused'}
                                </Typography>
                                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'grey.600' }}>
                                    Login required via the /client/control page to enable live updates.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* --------------------- BOTTOM ROW: DOCUMENTATION --------------------- */}

                <Grid item xs={12}>
                    <Box sx={{ mt: 4, mb: 4 }}>
                        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: 'grey.800' }}>
                            Workout Plan & Resources
                        </Typography>
                        <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
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

            <Box sx={{ mt: 8, textAlign: 'center', color: 'grey.500', fontSize: '0.875rem' }}>
                Dashboard served from unified server at 127.0.0.1:3000.
            </Box>
        </Container>
    );
};

export default Dashboard;