# Spotify Verification Script

Automated health check for Spotify OAuth integration.

## Usage

```bash
npm run verify:spotify
```

## What It Checks

1. **Server Status** - Verifies server is running and responding
2. **Auth Configuration** - Checks NextAuth and Spotify OAuth config
3. **Token Status** - Validates access/refresh tokens (both in-memory and file-based)
4. **Session Status** - Reports active user session if present

## Exit Codes

- `0` - All checks passed or configuration valid
- `1` - Configuration errors detected (missing env vars, server not running)

## Output Example

```
Spotify Integration Health Check
==================================

1. Server Status
✓ Server is running

2. Auth Configuration
✓ NextAuth configured
✓ Spotify provider configured
  Client ID: e3f3c31112ab4172b1a248e9de99518a
✓ Client secret present

3. Token Status
✓ Access token present
  User ID: 1282365133
✓ Refresh token present
✓ Token file exists
  Size: 687 bytes

4. Session Status
⚠ No active session
  Login to test full integration

Summary
=======
✓ All checks passed! Spotify integration is fully operational.
```

## When to Use

- After initial setup to confirm configuration
- After changing environment variables
- Before deploying to verify tokens are persisted
- When troubleshooting OAuth or token issues
- As part of CI/CD health checks

## Environment Variables

Set `BASE_URL` to override the default `http://127.0.0.1:3000`:

```bash
BASE_URL=http://localhost:3000 npm run verify:spotify
```

## Implementation Details

The script checks:

- `/api/debug/ping` - Server health
- `/api/debug/auth-check` - OAuth configuration
- `/api/debug/spotify-token-status` - In-memory token state
- `/api/debug/session` - Active session
- `logs/spotify_tokens.json` - Persisted tokens on disk

It intelligently handles cases where tokens exist in the file but not in session (common after server restart).
