# Environment Variables

This document provides a comprehensive list of all environment variables used in the HRM application. A valid environment configuration is crucial for the application to run correctly.

## Variable Reference

| Variable | Required | Description | Default / Example | Security Implications |
| :--- | :---: | :--- | :--- | :--- |
| `NODE_ENV` | No | The runtime environment. | `development` | Setting this to `production` is essential for security and performance optimizations. |
| `HOST` | No | The hostname the server will bind to. | `127.0.0.1` | In production, `0.0.0.0` is used to bind to all available network interfaces. |
| `PORT` | No | The port the server will listen on. | `3000` | Ensure this port is accessible in your deployment environment. |
| **NextAuth** | | | | |
| `NEXTAUTH_URL` | No | The public URL of the application. | `http://localhost:3000` | Must be the publicly accessible URL of your application for OAuth redirects to work correctly. |
| `NEXTAUTH_SECRET` | **Yes** | A secret string used to sign NextAuth.js JWTs. | | **CRITICAL**: This secret must be a long, random, and unique string. Leaking this variable will allow attackers to forge authentication tokens and gain unauthorized access to the application. **NEVER** commit this to version control. |
| **Spotify** | | | | |
| `SPOTIFY_CLIENT_ID` | **Yes** | The Client ID for your Spotify application. | | Public identifier for your Spotify application. |
| `SPOTIFY_CLIENT_SECRET` | **Yes** | The Client Secret for your Spotify application. | | **CRITICAL**: This is a secret credential used to authenticate your application with the Spotify API. Leaking it could allow others to misuse your Spotify application quota and access user data. **NEVER** commit this to version control. |
| `SPOTIFY_CALLBACK_URL` | No | The callback URL for Spotify OAuth. | `http://localhost:3000/api/auth/callback/spotify` | Must match the redirect URI configured in your Spotify Developer Dashboard. |
| `SPOTIFY_POLLING_INTERVAL_MS` | No | The interval, in milliseconds, at which to poll the Spotify API for playback state. | `3000` | Lower values provide faster updates but increase API usage. |
| `SPOTIFY_TOKEN_PERSISTENCE` | No | Whether to persist Spotify API tokens to disk. | `false` | Enabling this will write encrypted refresh tokens to the `logs` directory. Ensure the `ENCRYPTION_KEY` is set. |
| `SPOTIFY_DEBUG` | No | Enables verbose logging for the Spotify Polling service. | `false` | May log sensitive information. Only use in development. |
| **Security & Persistence** | | | | |
| `ENCRYPTION_KEY` | No | A 64-character hex string (32 bytes) used for encrypting and decrypting sensitive data, such as API tokens. | | **CRITICAL**: This key is required if `SPOTIFY_TOKEN_PERSISTENCE` is enabled. It must be a secure, random string. Leaking this key will allow attackers to decrypt persisted tokens and gain access to user data. **NEVER** commit this to version control. |
| **AI Services** | | | | |
| `GEMINI_API_KEY` | No | The API key for Google Gemini. | | **CRITICAL**: This is a secret credential for the Gemini API. Leaking it could lead to unauthorized use and billing. **NEVER** commit this to version control. |
| `GEMINI_MODEL` | No | The Gemini model to use for generating content. | `gemini-1.5-flash` | |
| **Debugging & Testing** | | | | |
| `TESTING` | No | Set to `true` when running tests to disable features like rate limiting. | `false` | Should never be set to `true` in a production environment. |

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
