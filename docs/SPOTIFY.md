# Spotify Integration

This document provides a comprehensive overview of the Spotify integration within the HRM Dashboard. It covers the architecture, authentication flow, Web Playback SDK, device management, and error handling.

## Architecture

The Spotify integration is built upon a client-server architecture that leverages WebSockets for real-time communication.

- **Backend**: The backend consists of several key services:
  - `spotifyTokenManager.ts`: Manages OAuth 2.0 tokens, including refreshing and persisting them.
  - `spotifyPolling.ts`: Polls the Spotify API for the current playback state and available devices.
  - `spotifyApiErrorHandling.ts`: Provides centralized error handling for all Spotify API requests.
- **Frontend**: The frontend is built with React and utilizes the following key components:
  - `SpotifyDisplay.tsx`: The main component for rendering the Spotify UI, including the now-playing track, playback controls, and device selector.
  - `useSpotifyWebPlayback.ts`: A custom hook that encapsulates the logic for the Spotify Web Playback SDK.

## Authentication Flow

Authentication is handled using NextAuth.js and the OAuth 2.0 Authorization Code Flow.

1.  The user clicks the "Login with Spotify" button.
2.  The user is redirected to the Spotify authorization page.
3.  After granting permission, the user is redirected back to the application.
4.  The application receives an authorization code, which it exchanges for an access token and refresh token.
5.  The tokens are stored securely and used to make requests to the Spotify API.

## Error Handling

Error handling is a critical part of the Spotify integration. The `spotifyApiErrorHandling.ts` service provides a centralized location for handling all API errors. This includes:

-   Refreshing the access token when it expires.
-   Retrying requests that fail due to network errors.
-   Providing clear and informative error messages to the user.

## Code Examples

### Sending Spotify Commands

To send a command to the Spotify service, you can use the `sendData` function from the `useWebSocket` hook. The following example shows how to send a "PLAY" command:

```typescript
import { useWebSocket } from '@/context/WebSocketContext';
import { SpotifyCommandMessage } from '@/types/websocket';

const { sendData } = useWebSocket();

const play = () => {
  const message: SpotifyCommandMessage = {
    type: 'SPOTIFY_COMMAND',
    command: 'PLAY',
  };
  sendData(message);
};
```

### Listening for Spotify Updates

To listen for updates to the Spotify playback state, you can use the `spotifyData` object from the `useWebSocket` hook. The following example shows how to display the current track name:

```typescript
import { useWebSocket } from '@/context/WebSocketContext';

const { spotifyData } = useWebSocket();

return <p>{spotifyData.trackName}</p>;
```
