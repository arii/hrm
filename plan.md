Here is the comprehensive plan (v4) converted to plain markdown for you to copy and paste.

-----

# Project Plan: Next.js HRM Dashboard Refactor

**Objective:** To refactor the existing HRM application into a modern, robust, and scalable Next.js application. This new version will integrate Material-UI (MUI) for the component library, WebSockets for real-time data transmission, Bluetooth heart rate monitoring, and Spotify integration.

-----

## 1\. Core Technologies

  * **Frontend:** Next.js (with App Router)
  * **UI Library:** Material-UI (MUI)
  * **Real-time Communication:** WebSockets (using `ws` or `Socket.io`)
  * **Bluetooth:** Web Bluetooth API (for browser-side connection)
  * **Music Integration:** Spotify Web API

-----

## 2\. System Architecture

The system will be composed of several key services. While these can be run from a single server for development, a production environment might separate them.

### Component Overview

  * **Next.js Frontend Server:**
      * Serves the main React application, including all pages and components.
      * Handles Server-Side Rendering (SSR) and API routes.
  * **WebSocket Server:**
      * Manages real-time connections from all clients.
      * Broadcasts heart rate data received from the HRM client to all dashboard clients.
  * **Spotify Service:**
      * Handles OAuth 2.0 authentication with the Spotify API.
      * Provides API endpoints (via Next.js API routes) to fetch user playback state, control music, and display "now playing" information.
  * **Bluetooth Client (Phone UI):**
      * A specific page in the Next.js app (`/phone`) designed to run on a mobile device.
      * Uses the Web Bluetooth API to connect to the heart rate monitor.
      * Sends heart rate data to the WebSocket server.

### Single Server Architecture (Monorepo Approach)

For simplicity and ease of deployment, we can run all services from the single Next.js server instance.

1.  **Next.js App:** Serves all pages (`/`, `/dashboard`, `/phone`, `/hrm_mock`, `/hrm`).
2.  **WebSocket Server:** Integrated into the Next.js custom server (if using Node.js server) or run as a separate process managed by the same deployment (e.g., using `concurrently` in development).
3.  **API Routes:** All backend logic, including Spotify authentication and proxying, will be handled within Next.js API Routes (e.g., `/api/spotify/auth`, `/api/spotify/now-playing`).

-----

## 3\. Application Structure (Next.js App Router)

```
/
|-- /app
|   |-- / (Page: Main launch page/dashboard)
|   |   |-- page.jsx
|   |   |-- components/
|   |   |   |-- Dashboard.jsx
|   |   |   |-- SpotifyPlayer.jsx
|   |   |   |-- HeartRateDisplay.jsx
|   |   |   |-- TabataTimer.jsx
|   |
|   |-- /phone (Page: Mobile client for BT connection)
|   |   |-- page.jsx
|   |   |-- components/
|   |   |   |-- BluetoothConnector.jsx
|   |
|   |-- /hrm_mock (Page: Mock HRM data sender)
|   |   |-- page.jsx
|   |
|   |-- /hrm (Page: Original HRM interface, if kept)
|   |   |-- page.jsx
|   |
|   |-- /api
|   |   |-- /spotify/
|   |   |   |-- login/route.js
|   |   |   |-- callback/route.js
|   |   |   |-- now-playing/route.js
|   |
|   |-- /hooks
|   |   |-- useWebSocket.js
|   |   |-- useBluetoothHRM.js
|   |   |-- useTabataTimer.js
|   |
|   |-- /context
|   |   |-- WebSocketProvider.jsx
|   |
|   |-- /lib
|   |   |-- spotify.js
|   |
|   |-- layout.jsx
|   |-- globals.css
|
|-- server.ts (Custom WebSocket server entry point)
|
|-- .env.local
|-- package.json
```

-----

## 4\. Key Features & Implementation Snippets

### 4.1. Bluetooth Heart Rate Monitoring (Client-Side)

**`useBluetoothHRM` Hook:**

```javascript
import { useState, useCallback } from 'react';

// Web Bluetooth Service and Characteristic UUIDs
const HRM_SERVICE_UUID = 'heart_rate';
const HRM_CHARACTERISTIC_UUID = 'heart_rate_measurement';

/**
 * Custom hook to manage Web Bluetooth connection to a Heart Rate Monitor.
 * @param {function(number)} onHeartRateChanged - Callback function to send data to WebSocket.
 */
export const useBluetoothHRM = (onHeartRateChanged) => {
  const [device, setDevice] = useState(null);
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [errorMessage, setErrorMessage] = useState('');
  const [heartRate, setHeartRate] = useState(0);

  // Function to parse heart rate data from the device
  const parseHeartRate = (value) => {
    const flags = value.getUint8(0);
    const rateAs16Bits = (flags & 0x01) !== 0;
    let heartRateValue;
    if (rateAs16Bits) {
      heartRateValue = value.getUint16(1, true); // true for little-endian
    } else {
      heartRateValue = value.getUint8(1);
    }
    return heartRateValue;
  };

  // Event handler for characteristic value changes
  const handleCharacteristicValueChanged = (event) => {
    const value = event.target.value;
    const newHeartRate = parseHeartRate(value);
    setHeartRate(newHeartRate);
    if (onHeartRateChanged) {
      onHeartRateChanged(newHeartRate); // Send to WebSocket
    }
  };

  // Connect function
  const connect = useCallback(async () => {
    setStatus('connecting');
    setErrorMessage('');
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API is not available in this browser.');
      }

      const btDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HRM_SERVICE_UUID] }],
        optionalServices: [HRM_SERVICE_UUID],
      });

      setDevice(btDevice);
      const server = await btDevice.gatt.connect();
      const service = await server.getPrimaryService(HRM_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(HRM_CHARACTERISTIC_UUID);

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

      setStatus('connected');
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  }, [onHeartRateChanged]);

  // Disconnect function
  const disconnect = () => {
    if (device && device.gatt.connected) {
      device.gatt.disconnect();
    }
    setStatus('disconnected');
    setDevice(null);
    setHeartRate(0);
  };

  return { connect, disconnect, status, errorMessage, heartRate };
};
```

### 4.2. Real-time Heart Rate Display (Dashboard)

**`HeartRateDisplay` Component (MUI):**

```jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Button, CircularProgress, Box } from '@mui/material';
import { Favorite, MonitorHeart } from '@mui/icons-material';
// Assume useWebSocket is a custom hook: const { lastMessage, readyState } = useWebSocket(WS_URL);

export const HeartRateDisplay = ({ lastMessage, readyState }) => {
  const [heartRate, setHeartRate] = useState(0);

  useEffect(() => {
    if (lastMessage && lastMessage.data) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'heart_rate' && data.value) {
          setHeartRate(data.value);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    }
  }, [lastMessage]);

  const getConnectionStatus = () => {
    if (readyState === 0) return { text: 'Connecting...', color: 'text.secondary' };
    if (readyState === 1) return { text: 'Connected', color: 'success.main' };
    if (readyState === 2) return { text: 'Disconnecting...', color: 'text.secondary' };
    if (readyState === 3) return { text: 'Disconnected', color: 'error.main' };
    return { text: 'Offline', color: 'error.main' };
  };

  const status = getConnectionStatus();

  return (
    <Card sx={{ minWidth: 275, borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            Heart Rate
          </Typography>
          <MonitorHeart sx={{ color: status.color }} />
        </Box>
        <Box display="flex" alignItems="center" justifyContent="center" my={2}>
          {readyState === 1 ? (
            <>
              <Favorite sx={{ color: 'red', fontSize: 60, marginRight: 2 }} />
              <Typography variant="h2" component="div" fontWeight="bold">
                {heartRate}
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ alignSelf: 'flex-end', pb: 1, ml: 1 }}>
                BPM
              </Typography>
            </>
          ) : (
            <CircularProgress />
          )}
        </Box>
        <Typography variant="body2" align="center" sx={{ color: status.color }}>
          {status.text}
        </Typography>
      </CardContent>
    </Card>
  );
};
```

### 4.3. Fitness Tabata Timer

**`useTabataTimer` Hook:**

```javascript
import { useState, useEffect, useRef } from 'react';

export const useTabataTimer = (initialSettings) => {
  const {
    prepareTime = 5,
    workTime = 20,
    restTime = 10,
    rounds = 8,
  } = initialSettings;

  const [timer, setTimer] = useState(prepareTime);
  const [currentRound, setCurrentRound] = useState(1);
  const [isActive, setIsActive] = useState(false);
  // States: 'prepare', 'work', 'rest', 'finished'
  const [currentState, setCurrentState] = useState('prepare');

  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimer((prevTimer) => prevTimer - 1);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isActive]);

  useEffect(() => {
    if (timer === 0) {
      if (currentState === 'prepare') {
        setCurrentState('work');
        setTimer(workTime);
      } else if (currentState === 'work') {
        setCurrentState('rest');
        setTimer(restTime);
      } else if (currentState === 'rest') {
        if (currentRound < rounds) {
          setCurrentRound((prevRound) => prevRound + 1);
          setCurrentState('work');
          setTimer(workTime);
        } else {
          // Finished
          setCurrentState('finished');
          setIsActive(false);
          clearInterval(intervalRef.current);
        }
      }
    }
  }, [timer, currentState, workTime, restTime, rounds, currentRound]);

  const startTimer = () => {
    if (currentState === 'finished') {
      resetTimer();
    }
    setIsActive(true);
  };

  const pauseTimer = () => {
    setIsActive(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setCurrentState('prepare');
    setCurrentRound(1);
    setTimer(prepareTime);
  };

  const totalTime = prepareTime + (workTime + restTime) * rounds - restTime;
  const elapsed = totalTime - (rounds - currentRound) * (workTime + restTime) - timer; // Simplified, needs refinement
  const progress = (timer / (currentState === 'work' ? workTime : (currentState === 'rest' ? restTime : prepareTime))) * 100;


  return {
    timer,
    currentRound,
    isActive,
    currentState,
    startTimer,
    pauseTimer,
    resetTimer,
    progress,
  };
};
```

**`TabataTimer` Component (MUI):**

```jsx
import React from 'react';
import { Card, CardContent, Typography, Button, Box, LinearProgress } from '@mui/material';
import { PlayArrow, Pause, Replay } from '@mui/icons-material';
// import { useTabataTimer } from '../hooks/useTabataTimer';

const stateColors = {
  prepare: 'info.main',
  work: 'error.main',
  rest: 'success.main',
  finished: 'text.secondary',
};

export const TabataTimer = () => {
  const {
    timer,
    currentRound,
    isActive,
    currentState,
    startTimer,
    pauseTimer,
    resetTimer,
    progress,
  } = useTabataTimer({ prepareTime: 5, workTime: 20, restTime: 10, rounds: 8 });

  const stateColor = stateColors[currentState];

  return (
    <Card sx={{ minWidth: 275, borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
          Tabata Timer
        </Typography>
        <Typography variant="h2" component="div" fontWeight="bold" align="center" sx={{ color: stateColor, my: 2 }}>
          {timer}
        </Typography>
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} color={currentState === 'work' ? 'error' : (currentState === 'rest' ? 'success' : 'info')} />
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" textTransform="uppercase" sx={{ color: stateColor }}>
            {currentState}
          </Typography>
          <Typography variant="h6">
            Round: {currentRound} / 8
          </Typography>
        </Box>
        <Box display="flex" justifyContent="center" gap={2}>
          {!isActive ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              onClick={startTimer}
              disabled={currentState === 'finished'}
            >
              Start
            </Button>
          ) : (
            <Button
              variant="contained"
              color="warning"
              startIcon={<Pause />}
              onClick={pauseTimer}
            >
              Pause
            </Button>
          )}
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Replay />}
            onClick={resetTimer}
          >
            Reset
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 4.4. Spotify Integration (Detailed Plan)

This feature uses the **OAuth 2.0 Authorization Code Flow** to securely connect to a user's Spotify account. All sensitive logic (client secrets, token exchange) is handled on the server via Next.js API Routes.

#### Step 1: Environment Variables

First, add your Spotify app credentials to `.env.local`:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
```

#### Step 2: API Route - Login (`/api/spotify/login/route.js`)

This route constructs the Spotify authorization URL and redirects the user to it.

```javascript
// app/api/spotify/login/route.js
import { NextResponse } from 'next/server';
import querystring from 'querystring';

export async function GET() {
  const scope =
    'user-read-playback-state user-modify-playback-state user-read-currently-playing';

  const params = querystring.stringify({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params}`;

  return NextResponse.redirect(authUrl);
}
```

#### Step 3: API Route - Callback (`/api/spotify/callback/route.js`)

Spotify redirects here after the user logs in. This route exchanges the `code` for an `access_token` and `refresh_token`, storing them in secure `httpOnly` cookies.

```javascript
// app/api/spotify/callback/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('Spotify Auth Error:', error);
    return NextResponse.redirect(new URL('/?error=spotify_login_failed', request.url));
  }

  try {
    const authHeader = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to fetch token');
    }

    // Set tokens in secure httpOnly cookies
    cookies().set('spotify_access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: data.expires_in, // (e.g., 3600 seconds)
      path: '/',
    });

    cookies().set('spotify_refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    // Redirect to the main dashboard
    return NextResponse.redirect(new URL('/', request.url));
  } catch (e) {
    console.error('Callback Error:', e);
    return NextResponse.redirect(new URL('/?error=spotify_callback_failed', request.url));
  }
}
```

#### Step 4: API Route - Now Playing (`/api/spotify/now-playing/route.js`)

The frontend polls this route. It securely fetches the `access_token` from cookies and requests data from Spotify. It also includes logic to **automatically refresh the token** if it's expired.

```javascript
// app/api/spotify/now-playing/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Helper function to get a new access token
async function getNewAccessToken(refreshToken) {
  const authHeader = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${authHeader}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  // Set the new token
  cookies().set('spotify_access_token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: data.expires_in,
    path: '/',
  });

  return data.access_token;
}

// Main GET handler
export async function GET() {
  const cookieStore = cookies();
  let accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const fetchNowPlaying = async (token) => {
    return fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  let spotifyResponse = await fetchNowPlaying(accessToken);

  if (spotifyResponse.status === 401) {
    // Token expired, try to refresh
    try {
      const newAccessToken = await getNewAccessToken(refreshToken);
      spotifyResponse = await fetchNowPlaying(newAccessToken);
    } catch (e) {
      // Refresh failed, user needs to log in again
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    }
  }

  if (spotifyResponse.status === 204 || !spotifyResponse.ok) {
    // 204 = No content (nothing is playing)
    return NextResponse.json({ isPlaying: false }, { status: 200 });
  }

  const song = await spotifyResponse.json();
  
  if (!song.item) {
     return NextResponse.json({ isPlaying: false }, { status: 200 });
  }

  const data = {
    isPlaying: song.is_playing,
    title: song.item.name,
    artist: song.item.artists.map((_artist) => _artist.name).join(', '),
    album: song.item.album.name,
    albumImageUrl: song.item.album.images[0]?.url,
  };

  return NextResponse.json(data);
}
```

#### Step 5: Frontend Component (`/app/components/SpotifyPlayer.jsx`)

This component displays a login button or the currently playing song by polling the `/api/spotify/now-playing` route.

```jsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardMedia, Typography, Button, Box } from '@mui/material';
import { MusicNote, Login } from '@mui/icons-material';

export const SpotifyPlayer = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchNowPlaying = async () => {
    try {
      const res = await fetch('/api/spotify/now-playing');
      if (res.status === 401) {
        // Not logged in or refresh failed
        setData(null);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const songData = await res.json();
        setData(songData);
      }
    } catch (e) {
      console.error('Failed to fetch now playing', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Fetch immediately
    fetchNowPlaying();

    // Poll every 5 seconds
    const interval = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Card sx={{ minWidth: 275, borderRadius: 3, boxShadow: 3 }}><CardContent><Typography>Loading Spotify...</Typography></CardContent></Card>;
  }

  if (!data || !data.isPlaying) {
    return (
      <Card sx={{ minWidth: 275, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography color="text.secondary" gutterBottom>Spotify</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {data ? 'Nothing playing' : 'Log in to connect Spotify'}
          </T>
          {!data && (
            <Button
              variant="contained"
              startIcon={<Login />}
              href="/api/spotify/login"
              sx={{ backgroundColor: '#1DB954', '&:hover': { backgroundColor: '#1ED760' } }}
            >
              Login to Spotify
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ display: 'flex', minWidth: 275, borderRadius: 3, boxShadow: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto' }}>
        <CardContent sx={{ flex: '1 0 auto' }}>
          <Typography component="div" variant="h6" noWrap>
            {data.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" component="div" noWrap>
            {data.artist}
          </Typography>
        </CardContent>
      </Box>
      <CardMedia
        component="img"
        sx={{ width: 151 }}
        image={data.albumImageUrl}
        alt={data.album}
      />
    </Card>
  );
};
```

-----

## 5\. Current Status and Implementation Notes

This section documents the current state of the refactoring process and key implementation details that have been updated from the original plan.

**Server Configuration**:
*   The custom server entry point has been converted from `server.js` to `server.ts` to allow for full TypeScript support in the server environment.
*   The project now uses `pm2` to run `server.ts` in development, with `ts-node` as the interpreter. The `dev` script in `package.json` is configured to start the server as a background process.
*   The `tsconfig.json` has been updated with `module: "CommonJS"` to ensure compatibility with `ts-node` and Node.js's module system.

**Known Issues**:
*   A persistent TypeScript error (`TS2769`) occurs on the `server.listen` line in `server.ts`. This is currently bypassed with `@ts-ignore` to allow the development server to run. This should be investigated further to find a proper solution.

**Next Steps**:
1.  Run `npm run dev` to start the server in the background using `pm2`.
2.  Use `npm run pm2:logs` to monitor the server logs.
3.  Verify that the application is running and that the interactive development workflow is improved.
4.  Continue with the implementation of the remaining features as outlined in this plan.