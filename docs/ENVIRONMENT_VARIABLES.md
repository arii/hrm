# Environment Variable Handling Standards

This document provides clear standards for managing environment variables (env vars) within the HRM project. Proper handling of environment variables is critical for security, maintainability, and preventing configuration-related bugs.

## Core Principles

1.  **Security is Paramount**: Never commit secrets or environment-specific configurations to the repository.
2.  **Fail Fast**: The application should fail at startup if critical environment variables are missing or invalid, rather than failing unpredictably at runtime.
3.  **Clarity and Explicitness**: The purpose and type of each environment variable should be clear. Avoid vague or generic names.

## Best Practices

### 1. Centralized Validation

All environment variables are validated in a single, centralized location: `lib/env.ts`. This validation occurs at application startup using a Zod schema, which provides both runtime validation and static type inference.

### 2. Avoid Direct `process.env` Access

Do not use `process.env` directly in the application code. Instead, import the validated `env` object from `lib/env.ts`. This ensures that all environment variables are accessed in a type-safe manner.

**Correct Pattern:**

```typescript
import { env } from '@/lib/env';

const port = env.PORT;
```

## Environment Variable Reference

| Variable | Description | Required | Default |
| --- | --- | --- | --- |
| `NODE_ENV` | The application environment. | Yes | `development` |
| `PORT` | The port the application will run on. | Yes | `3000` |
| `HOST` | The hostname the application will bind to. | Yes | `127.0.0.1` |
| `DATABASE_URL` | The connection string for the database. | Yes | |
| `NEXTAUTH_URL` | The base URL for NextAuth. | Yes | |
| `NEXTAUTH_SECRET` | A secret key for NextAuth. | Yes | |
| `INTERNAL_TOKEN_DELIVERY_SECRET`| A secret key for the internal token delivery endpoint. | Yes | |
| `SPOTIFY_CLIENT_ID` | The client ID for the Spotify API. | Yes | |
| `SPOTIFY_CLIENT_SECRET` | The client secret for the Spotify API. | Yes | |
| `SPOTIFY_CALLBACK_URL` | The callback URL for the Spotify API. | No | |
| `SPOTIFY_POLLING_INTERVAL_MS`| The interval in milliseconds to poll the Spotify API. | Yes | `5000` |
| `SPOTIFY_DEBUG` | Enable debug logging for the Spotify service. | No | |
| `SPOTIFY_EXPECTED_USER_ID` | The expected user ID for the Spotify service. | No | |
| `WS_URL` | The URL for the WebSocket server. | No | |
| `GOOGLE_DOC_WORKOUT_URL` | The URL for the Google Doc workout plan. | No | |
| `GEMINI_API_KEY` | The API key for the Gemini API. | No | |
| `GEMINI_MODEL` | The model to use for the Gemini API. | No | |
| `TESTING` | Enable testing mode. | No | |
| `CI` | Enable CI mode. | No | |
| `ANALYZE` | Enable bundle analysis. | No | |
| `npm_package_version` | The version of the application. | No | |
| `NEXT_PUBLIC_WS_URL` | The public URL for the WebSocket server. | No | |
| `NEXT_PUBLIC_API_URL` | The public URL for the API. | No | |
| `NEXT_PUBLIC_USE_NATIVE_TABLE`| Enable the native table feature. | No | |
