# Environment Variables

This document provides a comprehensive guide to the environment variables used in this application. A centralized, type-safe validation system (`lib/env.ts`) ensures that the application fails fast if any required variables are missing or invalid.

## Server-Side Variables

These variables are used exclusively on the server and should not be exposed to the client.

### Application & Server

-   **`NODE_ENV`**: The Node.js environment.
    -   **Values**: `development`, `production`, `test`
    -   **Required**: Yes
    -   **Default**: `development`

-   **`PORT`**: The port the server will listen on.
    -   **Required**: No
    -   **Default**: `3000`

-   **`HOST`**: The hostname the server will bind to.
    -   **Required**: No
    -   **Default**: `127.0.0.1` in development, `0.0.0.0` in production.

### NextAuth

-   **`NEXTAUTH_URL`**: The canonical URL of the application.
    -   **Required**: No
    -   **Security**: This is used for OAuth redirects and should be set to the public URL of your application in production.

-   **`NEXTAUTH_SECRET`**: A secret used to sign NextAuth.js JWTs and encrypt session data.
    -   **Required**: Yes
    -   **Security**: This is a critical security variable. It should be a long, random string. You can generate one with `openssl rand -hex 32`.

### Spotify

-   **`SPOTIFY_CLIENT_ID`**: The Client ID for your Spotify application.
    -   **Required**: Yes
    -   **Security**: This is a public identifier for your Spotify app.

-   **`SPOTIFY_CLIENT_SECRET`**: The Client Secret for your Spotify application.
    -   **Required**: Yes
    -   **Security**: This is a critical security variable and must be kept secret.

-   **`SPOTIFY_CALLBACK_URL`**: The callback URL for your Spotify application.
    -   **Required**: No
    -   **Default**: `[NEXTAUTH_URL]/api/auth/callback/spotify`

-   **`SPOTIFY_POLLING_INTERVAL_MS`**: The interval in milliseconds at which to poll the Spotify API for playback state.
    -   **Required**: No
    -   **Default**: `3000`

### Security

-   **`ENCRYPTION_KEY`**: A 64-character hex key used for encrypting sensitive data, such as Spotify refresh tokens.
    -   **Required**: Yes
    -   **Security**: This is a critical security variable. You can generate one with `openssl rand -hex 32`.

-   **`INTERNAL_TOKEN_DELIVERY_SECRET`**: A secret used to secure the internal API endpoint for delivering tokens.
    -   **Required**: Yes
    -   **Security**: This should be a long, random string.

### Database

-   **`DATABASE_URL`**: The connection string for your database.
    -   **Required**: Yes
    -   **Security**: This is a critical security variable and must be kept secret.

### Features

-   **`GOOGLE_DOC_WORKOUT_URL`**: The URL of a Google Doc to display as the workout plan.
    -   **Required**: No

-   **`GEMINI_API_KEY`**: The API key for Google Gemini.
    -   **Required**: No

### Build & Test

-   **`TESTING`**: Set to `"true"` to disable certain features during testing (e.g., rate limiting).
    -   **Required**: No

-   **`CI`**: Set to `"true"` in a Continuous Integration environment.
    -   **Required**: No

-   **`ANALYZE`**: Set to `"true"` to enable the bundle analyzer.
    -   **Required**: No

-   **`INCLUDE_MOBILE`**: Set to `"true"` to include mobile browsers in Playwright tests.
    -   **Required**: No

-   **`TEST_BASE_URL`**: The base URL to use for Playwright tests.
    -   **Required**: No

-   **`CHROME_PROFILE_PATH`**: The path to a Chrome profile to use for local OAuth testing.
    -   **Required**: No

-   **`SPOTIFY_EXPECTED_USER_ID`**: The expected Spotify user ID for local OAuth testing.
    -   **Required**: No

## Client-Side Variables

These variables are safe to be exposed to the client and are prefixed with `NEXT_PUBLIC_`.

-   **`NEXT_PUBLIC_WS_URL`**: The URL of the WebSocket server.
    -   **Required**: No

-   **`NEXT_PUBLIC_API_URL`**: The URL of the API server.
    -   **Required**: No

-   **`NEXT_PUBLIC_USE_NATIVE_TABLE`**: Set to `"true"` to use a native HTML table instead of a Material-UI table.
    -   **Required**: No
