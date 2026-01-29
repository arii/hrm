# Spotify Integration & Web Playback SDK Deep Dive

## 1. Spotify Integration Overview

This document provides a comprehensive overview of the Spotify integration within the HRM dashboard application. It details the architecture, authentication, Web Playback SDK usage, device management, and error handling.

### Available Features

-   **User Authentication**: Securely log in using a Spotify account via OAuth2.
-   **Playback Control**: Play, pause, skip to the next/previous track, and adjust volume.
-   **Track Display**: Shows the currently playing track, artist, album, and album art.
-   **Device Selection**: View available Spotify devices and transfer playback between them.
-   **Web Playback**: Play music directly in the browser using the Spotify Web Playback SDK.

### User Journey

1.  **Login**: The user clicks the login button and is redirected to Spotify to authorize the application.
2.  **Playback**: Once authenticated, the user's current playback state is displayed. They can control playback using the UI controls.
3.  **Device Switching**: The user can open the device selector to transfer playback to any of their available devices, including the browser itself.

### Architecture

The integration follows a decoupled architecture:

-   **Frontend (Next.js)**:
    -   Handles user interaction and displays playback information.
    -   Uses **NextAuth.js** for the Spotify OAuth2 flow.
    -   Communicates with the backend via **WebSockets** for real-time updates.
    -   Integrates the **Spotify Web Playback SDK** to turn the browser into a Spotify device.
-   **Backend (Node.js/Express)**:
    -   Maintains a persistent connection to the Spotify API.
    -   **Polls** Spotify for the current playback state and available devices.
    -   Manages Spotify API tokens and handles refreshing them.
    -   Broadcasts updates to all connected clients via WebSockets.

## 2. Authentication & Setup

### OAuth2 Flow

Authentication is handled by NextAuth.js using the `SpotifyProvider`.

1.  The user initiates the login from the frontend.
2.  NextAuth redirects the user to the Spotify authorization page.
3.  After the user grants permission, Spotify redirects back to a NextAuth callback URL.
4.  NextAuth intercepts the authorization code, exchanges it for an access token and refresh token, and creates a session.
5.  Crucially, the tokens are also securely forwarded to the persistent backend server via an internal API endpoint (`app/api/internal/token-delivery/route.ts`) to be used for server-side API calls.

### SPOTIFY_CLIENT_ID/SECRET Setup

To enable the Spotify integration, you must set the following environment variables in your `.env.local` file:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_DEVICE_POLLING_INTERVAL_MS=10000
```

These credentials are obtained from the Spotify Developer Dashboard.

### Token Management and Refresh

-   **Frontend**: The `useSpotifyWebPlayback` hook (`hooks/useSpotifyWebPlayback.ts`) is responsible for fetching a short-lived access token from a dedicated Next.js API route. This token is used exclusively for the Web Playback SDK.
-   **Backend**: The `SpotifyTokenManager` service (`services/spotifyTokenManager.ts`) stores the access and refresh tokens. It's responsible for refreshing the access token using the refresh token whenever it expires. The `SpotifyPolling` service (`services/spotifyPolling.ts`) uses this manager to ensure it always has a valid token for its API calls.
-   **Synchronization**: When a user logs in or when a token is refreshed, the updated tokens are sent from the NextAuth session to the Next.js internal API route (`app/api/internal/token-delivery/route.ts`), which then securely forwards them to the persistent Node.js/Express backend's `SpotifyPolling` service (`services/spotifyPolling.ts`) to keep them in sync.

### Security Considerations

-   The `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and user refresh tokens are sensitive credentials and are only handled server-side.
-   The internal API endpoint for token delivery (`app/api/internal/token-delivery/route.ts`) is protected by a shared secret (`NEXTAUTH_SECRET`). The NextAuth backend includes this secret in the `x-internal-token-secret` header of its request, and the receiving endpoint middleware verifies that this header matches the server's environment variable. This ensures only NextAuth can send tokens to the backend.

## 3. Web Playback SDK

The Web Playback SDK allows music to be played directly through the browser, turning it into a controllable Spotify device.

### Initialization Process

The `useSpotifyWebPlayback` hook (`hooks/useSpotifyWebPlayback.ts`) manages the entire lifecycle of the SDK:

1.  **Script Loading**: The hook dynamically appends the Spotify Player SDK script (`https://sdk.scdn.co/spotify-player.js`) to the document.
2.  **Player Instantiation**: Once the script is loaded, `window.onSpotifyWebPlaybackSDKReady` is called. The hook then creates a new `window.Spotify.Player` instance.
3.  **Authentication**: The player is configured with a `getOAuthToken` function that fetches a valid access token from our Next.js API. This is how the SDK authenticates with Spotify.
4.  **Connection**: The hook calls `player.connect()`, which establishes a connection to Spotify's servers.
5.  **Ready State**: The player emits a `ready` event when it's successfully connected and has a `device_id`. The hook captures this `device_id` and sets its `isReady` state to `true`.

### Why Pre-Auth Check Was Removed

Previously, the application might have checked for an existing authentication session before attempting to initialize the Web Playback SDK. This check was removed to support a more seamless user experience for unauthenticated users. The SDK is now initialized regardless of auth state. The `getOAuthToken` function itself serves as the authentication gatekeeper. If the user is not logged in, the token fetch will fail gracefully, and the SDK will not connect, without breaking the UI.

### Unauthenticated User Handling

For users who are not logged in to Spotify, the application provides a clear call-to-action to log in. The `useSpotifyWebPlayback` hook will fail to get an OAuth token, preventing the player from connecting. The UI then reflects this state, prompting the user to log in to enable playback features.

### Fallback Behavior

If the Web Playback SDK fails to initialize or connect (e.g., due to a browser that doesn't support the required EME APIs), the browser player will not appear in the list of available devices. The user can still control playback on their other Spotify devices.

### Error Scenarios

The `useSpotifyWebPlayback` hook listens for several error events from the player:

-   `initialization_error`: Fired if the SDK script fails to initialize.
-   `authentication_error`: Fired if the provided OAuth token is invalid or expired.
-   `account_error`: Fired for issues related to the user's Spotify account (e.g., not having a Premium subscription, which is required for Web Playback).

These errors are caught and displayed to the user using the global error handling system.

## 4. Device Selection & Management

### How Selection Works

The `SpotifyPolling` service (`services/spotifyPolling.ts`) on the backend periodically fetches a list of the user's available Spotify devices using `sdk.player.getAvailableDevices()`. This list is then broadcast to the frontend via WebSockets and updated in the application's state.

When a user selects a device from the UI, a `TRANSFER_PLAYBACK` command is sent to the backend via WebSocket. The backend then instructs the Spotify API to transfer playback to the selected device ID.

### SpotifyDevice Type Documentation

The `SpotifyDevice` type, defined in `types/core.ts`, represents a single Spotify device. Its structure is detailed in the "Type Documentation" section below.

### Available Device Types

Spotify supports various device types, including:

-   `Computer`
-   `Speaker`
-   `Smartphone`
-   `Tablet`
-   `CastVideo` (Chromecast)

The Web Playback SDK registers the browser as a `Computer` device.

### WebSockets Integration

Device management is tightly integrated with WebSockets:

-   The backend's `SpotifyPolling` service fetches the device list every `SPOTIFY_DEVICE_POLLING_INTERVAL_MS` milliseconds. This value is part of the environment variable schema defined in `lib/env.ts` (using Zod). It can be overridden via an environment variable but defaults to 10,000ms if not set.
-   Any changes to the device list are broadcast in a `SPOTIFY_UPDATE` message to all connected clients.
-   The frontend receives this message, updates its state, and re-renders the device selector UI to show the most current list of devices.

This architecture ensures that if a user starts or stops playing music on another device (like their phone), it will be reflected in the web dashboard automatically.

## 5. Error Handling & Recovery

### Common Errors

-   **401 Unauthorized**: The access token is expired or invalid.
-   **403 Forbidden**: The user's account does not have the required permissions or subscription level (e.g., Spotify Premium is required for many actions).
-   **404 Not Found**: The requested resource (e.g., a device ID) could not be found.

### Expected API Responses

-   **204 No Content**: This is an expected success response for many playback commands (e.g., play, pause) that don't return any data. The code specifically handles this to prevent it from being treated as an error.

### Recovery Strategies

-   **Token Expiration**: The backend `SpotifyTokenManager` automatically uses the refresh token to get a new access token when a 401 error is detected. The `useSpotifyWebPlayback` hook on the frontend will also request a new token on subsequent initializations.
-   **API Errors**: The `handleSpotifyApiError` utility function (`services/spotifyApiErrorHandling.ts`) centralizes logging and handling of common Spotify API errors.

### User-Facing Messages

Errors are communicated to the user via the application's notification system (notistack). For example, if an account error occurs with the Web Playback SDK, a message like "Account error: A Premium account is required." is displayed.

### Logging and Debugging

-   All significant Spotify-related actions, errors, and state changes are logged on the server with detailed context.
-   The `useSpotifyWebPlayback` hook includes extensive `console.log` and `console.error` messages to aid in client-side debugging.

## 6. Type Documentation

### SpotifyDevice Interface

The `SpotifyDevice` interface in `types/core.ts` is the primary type for device management. It mirrors the structure returned by the Spotify API:

```typescript
export interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string; // e.g., "Computer", "Speaker", "Smartphone"
  volume_percent: number;
}
```

### Related Types

-   `SpotifyData` (`types/websocket.ts`): Represents the complete state of the Spotify integration that is broadcast to the client, including track information and the list of devices.
-   `SpotifyTokenPayload` (`services/spotifyTokenManager.ts`): The structure of the token object passed from NextAuth to the backend.
-   **Official SDK Types**: For detailed data structures such as `Track`, `Artist`, and `Album`, developers should refer to the official `@spotify/web-api-ts-sdk` library, which is the source of truth for these types.

## 7. Architecture Decisions

### Device Selection to WebSockets (Why)

Moving device data fetching to the backend and broadcasting it via WebSockets was a key architectural decision.

-   **Rationale**: It centralizes the logic for fetching devices, reducing redundant API calls from multiple clients. It ensures a single source of truth for the device list and provides real-time updates to all connected clients automatically, creating a more responsive and synchronized user experience.

### Pre-Auth Check Removal (Rationale)

-   **Rationale**: Removing a strict pre-authentication check before loading the Web Playback SDK simplifies the frontend logic. It allows the UI to load consistently for both authenticated and unauthenticated users. The authentication is handled gracefully at the point where the SDK requests an OAuth token, which aligns with a "progressive enhancement" approach.

### Unauthenticated Support (Design)

-   **Rationale**: The design for unauthenticated users focuses on providing a good "empty state" experience. Instead of showing broken or empty components, the UI clearly indicates that the user needs to log in to access Spotify features. This is achieved by letting the authentication flow fail silently within the `useSpotifyWebPlayback` hook and having the UI components react to the resulting unauthenticated state.
-   **Safe API Wrapper**: The backend SDK usage is wrapped in a `SafeSpotifyApi` (`services/safeSpotifyApi.ts`) to handle potential issues with Spotify's API, such as commands that succeed but return an empty response body. This aligns with the project's convention of creating type-safe wrappers for third-party APIs.
