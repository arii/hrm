# Spotify Integration Guide

Quick setup and troubleshooting for Spotify OAuth integration.

## Quick Reference

| Command                                           | Purpose                                             |
| ------------------------------------------------- | --------------------------------------------------- |
| `npm run verify:spotify`                          | Run automated health check (recommended first step) |
| `npm run dev:clean`                               | Start dev server with Spotify integration           |
| `curl http://127.0.0.1:3000/api/debug/auth-check` | Check OAuth configuration                           |
| `cat logs/spotify_tokens.json`                    | View persisted tokens                               |

**Common Actions:**

- First time setup → Follow [Quick Setup](#quick-setup) below
- Configuration issues → Run `npm run verify:spotify` to diagnose
- After server restart → Tokens load automatically from `logs/spotify_tokens.json`
- Token expired → Automatic refresh every 55 minutes

## Quick Setup

### 1. Create Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. In app settings, add redirect URI: `http://127.0.0.1:3000/api/auth/callback/spotify`
4. Copy Client ID and Client Secret

### 2. Configure Environment

Create/update `.env.local` in project root:

```bash
SPOTIFY_CLIENT_ID=your_32_character_client_id
SPOTIFY_CLIENT_SECRET=your_32_character_client_secret
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
```

Generate NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

### 3. Start Server & Login

```bash
npm run dev:clean
```

Open http://127.0.0.1:3000/client/control and click "Login with Spotify"

## Verification

### Automated Health Check (Recommended)

Run the automated verification script to check all components:

```bash
npm run verify:spotify
```

This script checks:

- Server is running
- NextAuth and Spotify configuration loaded
- Token file exists and contains valid tokens
- Session status

### Manual Verification

Check configuration is loaded:

```bash
curl http://127.0.0.1:3000/api/debug/auth-check | jq
```

Expected:

```json
{
  "nextAuthConfigured": true,
  "spotifyConfigured": true,
  "clientId": "e3f3c31112ab4172b1a248e9de99518a",
  "hasClientSecret": true,
  "redirectUri": "http://127.0.0.1:3000/api/auth/callback/spotify"
}
```

Check token status after login:

```bash
curl http://127.0.0.1:3000/api/debug/spotify-token-status | jq
```

Check token file directly:

```bash
cat logs/spotify_tokens.json | jq
```

## Common Issues

**💡 Tip:** Run `npm run verify:spotify` after any configuration changes or troubleshooting steps to confirm everything is working.

### "Invalid Client" Error

**Cause:** Spotify doesn't recognize your credentials

**Fix:**

1. Verify Client ID and Secret in `.env.local` match Spotify dashboard exactly (no quotes, no spaces)
2. Regenerate Client Secret in Spotify dashboard if needed
3. Restart server: `npm run pm2:stop && npm run dev:clean`

### "Redirect URI Mismatch" Error

**Cause:** Redirect URI in Spotify dashboard doesn't match NextAuth

**Fix:**

1. Go to Spotify Dashboard > Your App > Edit Settings
2. Add exact URI: `http://127.0.0.1:3000/api/auth/callback/spotify`
3. Save and wait 1-2 minutes for changes to propagate

### Token Not Persisting

**Symptoms:** Must login every server restart

**Fix:**

- Check `logs/spotify_tokens.json` exists after login
- Verify `logs/` directory is writable
- Check server logs: `npm run pm2:logs | grep token`

### Controls Not Working

**Symptoms:** Buttons don't control Spotify playback

**Fix:**

1. Ensure Spotify is playing on an active device
2. Check browser console for WebSocket errors
3. Verify tokens are valid: `cat logs/spotify_tokens.json`

## Architecture

### OAuth Flow

1. User clicks "Login with Spotify" → redirects to Spotify
2. Spotify redirects back to NextAuth callback
3. NextAuth JWT callback posts tokens to `/api/internal/token-delivery`
4. Token delivery route saves to `logs/spotify_tokens.json`
5. Server loads tokens on startup from file via `SpotifyTokenManager`

### Key Files

- `lib/auth.ts` - NextAuth config + JWT callback for token delivery
- `app/api/internal/token-delivery/route.ts` - Saves tokens to file
- `services/spotifyTokenManager.ts` - Token refresh every 55 minutes
- `services/spotifyPolling.ts` - API polling every 3 seconds, loads tokens on startup
- `logs/spotify_tokens.json` - Persisted tokens (not in git)

### Token Lifecycle

```
Login → JWT Callback → POST /api/internal/token-delivery → Save to logs/spotify_tokens.json
                                                                          ↓
Server Restart → SpotifyPolling constructor → loadTokenFromManager() → Load from file → Start polling
                                                                          ↓
                                      55 min → SpotifyTokenManager refresh → Update file
```

## Debug Endpoints

### Auth Configuration

```bash
curl http://127.0.0.1:3000/api/debug/auth-check
```

Returns: nextAuthConfigured, spotifyConfigured, clientId, hasClientSecret, redirectUri

### Session Status

```bash
curl http://127.0.0.1:3000/api/debug/session
```

Returns current NextAuth session including accessToken

### Token Status

```bash
curl http://127.0.0.1:3000/api/debug/spotify-token-status
```

Returns: hasAccessToken, hasRefreshToken, userId, tokenAge, willExpireIn

### Token File

```bash
cat logs/spotify_tokens.json
```

Shows persisted tokens including refresh_token, access_token, expires_in

## PKCE Compliance

NextAuth 4.x automatically implements PKCE (Proof Key for Code Exchange) for all OAuth providers including Spotify. No additional configuration required.

Verification:

- Check NextAuth logs during OAuth flow for code_verifier and code_challenge
- Spotify API validates PKCE automatically
