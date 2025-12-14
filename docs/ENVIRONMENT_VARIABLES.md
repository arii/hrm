# Environment Variables

This document provides a comprehensive list of all environment variables used in the HRM application. A valid environment configuration is crucial for the application to run correctly.

## Variable Reference

| Variable                        | Required | Description                                                                                                | Default / Example                               |
| ------------------------------- | :------: | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `NODE_ENV`                      |    No    | The runtime environment.                                                                                   | `development`                                   |
| `HOST`                          |    No    | The hostname the server will bind to.                                                                      | `127.0.0.1`                                     |
| `PORT`                          |    No    | The port the server will listen on.                                                                        | `3000`                                          |
|                                 |          |                                                                                                            |                                                 |
| **NextAuth**                    |          |                                                                                                            |                                                 |
| `NEXTAUTH_URL`                  |    No    | The public URL of the application.                                                                         | `http://localhost:3000`                         |
| `NEXTAUTH_SECRET`               |   Yes    | A secret string used to sign NextAuth.js JWTs.                                                             | `your-super-secret-nextauth-key`                |
|                                 |          |                                                                                                            |                                                 |
| **Spotify**                     |          |                                                                                                            |                                                 |
| `SPOTIFY_CLIENT_ID`             |   Yes    | The Client ID for your Spotify application.                                                                | `your-spotify-client-id`                        |
| `SPOTIFY_CLIENT_SECRET`         |   Yes    | The Client Secret for your Spotify application.                                                            | `your-spotify-client-secret`                    |
| `SPOTIFY_CALLBACK_URL`          |    No    | The callback URL for Spotify OAuth.                                                                        | `http://localhost:3000/api/auth/callback/spotify` |
| `SPOTIFY_POLLING_INTERVAL_MS`   |    No    | The interval, in milliseconds, at which to poll the Spotify API for playback state.                        | `3000`                                          |
| `SPOTIFY_TOKEN_PERSISTENCE`     |    No    | Whether to persist Spotify API tokens to disk.                                                             | `false`                                         |
| `SPOTIFY_DEBUG`                 |    No    | Enables verbose logging for the Spotify Polling service.                                                   | `false`                                         |
|                                 |          |                                                                                                            |                                                 |
| **Security & Persistence**      |          |                                                                                                            |                                                 |
| `ENCRYPTION_KEY`                |    No    | A 64-character hex string (32 bytes) used for encrypting and decrypting sensitive data, such as API tokens.  |                                                 |
|                                 |          |                                                                                                            |                                                 |
| **AI Services**                 |          |                                                                                                            |                                                 |
| `GEMINI_API_KEY`                |    No    | The API key for Google Gemini.                                                                             |                                                 |
| `GEMINI_MODEL`                  |    No    | The Gemini model to use for generating content.                                                            | `gemini-1.5-flash`                              |
|                                 |          |                                                                                                            |                                                 |
| **Debugging & Testing**         |          |                                                                                                            |                                                 |
| `TESTING`                       |    No    | Set to `true` when running tests to disable features like rate limiting.                                   | `false`                                         |

## Configuration Precedence

The application loads environment variables in the following order:

1.  `.env.production.local`
2.  `.env.development.local`
3.  `.env.test.local`
4.  `.env.local`
5.  `.env.production`
6.  `.env.development`
7.  `.env.test`
8.  `.env`
9.  System environment variables

This allows for flexible configuration for different environments. For local development, you should create a `.env.local` file by copying the `.env.example` template and filling in the required values.
