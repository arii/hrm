# Spotify Integration Troubleshooting Guide

This guide addresses the recurring "Invalid Client" error and other Spotify integration issues.

## Quick Fix Checklist

If you're seeing "Invalid Client" errors, work through this checklist:

- [ ] Spotify app exists at https://developer.spotify.com/dashboard
- [ ] Client ID and Secret are copied correctly to `.env.local`
- [ ] Redirect URI is exactly: `http://127.0.0.1:3000/api/auth/callback/spotify`
- [ ] No trailing slashes in redirect URI
- [ ] `.env.local` file is in project root directory
- [ ] Server restarted after changing `.env.local`
- [ ] Auth check endpoint returns valid configuration

## Step-by-Step Verification

### 1. Verify Spotify Dashboard Configuration

Visit: https://developer.spotify.com/dashboard

**Check your app settings:**

```
App Name: HRM Dashboard (or whatever you named it)
Redirect URIs:
  ✅ http://127.0.0.1:3000/api/auth/callback/spotify
  ✅ http://localhost:3000/api/auth/callback/spotify (optional)

Settings > Basic Information:
  Client ID: e3f3c31112ab4172b1a248e9de99518a (example)
  Show Client Secret: [Click to reveal]
```

**Common mistakes in Spotify dashboard:**

- ❌ Missing `/spotify` suffix: `http://127.0.0.1:3000/api/auth/callback`
- ❌ Wrong protocol: `https://127.0.0.1:3000/api/auth/callback/spotify`
- ❌ Trailing slash: `http://127.0.0.1:3000/api/auth/callback/spotify/`
- ❌ Wrong port: `http://127.0.0.1:3001/api/auth/callback/spotify`

### 2. Verify .env.local File

**Location:** Project root (`/home/ari/hrm/.env.local`)

```bash
# Check file exists
ls -la .env.local

# View contents (be careful not to commit this!)
cat .env.local
```

**Required format:**

```bash
SPOTIFY_CLIENT_ID=your_client_id_without_quotes
SPOTIFY_CLIENT_SECRET=your_client_secret_without_quotes
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=random_base64_string
```

**Common mistakes in .env.local:**

- ❌ Quotes around values: `SPOTIFY_CLIENT_ID="abc123"`
- ❌ Spaces around `=`: `SPOTIFY_CLIENT_ID = abc123`
- ❌ Wrong variable names: `SPOTIFY_ID` instead of `SPOTIFY_CLIENT_ID`
- ❌ File in wrong location: `app/.env.local` instead of root
- ❌ Line breaks or special characters in values

### 3. Verify Server Loaded Configuration

Start the server and check the debug endpoint:

```bash
# Terminal 1: Start server
npm run dev:clean

# Terminal 2: Check auth configuration
curl http://127.0.0.1:3000/api/debug/auth-check | jq
```

**Expected output:**

```json
{
  "nextAuthConfigured": true,
  "spotifyConfigured": true,
  "clientId": "e3f3c31112ab4172b1a248e9de99518a",
  "hasClientSecret": true,
  "redirectUri": "http://127.0.0.1:3000/api/auth/callback/spotify"
}
```

**If spotifyConfigured is false:**

- Server didn't load the environment variables
- Check `.env.local` is in correct location
- Restart server: `npm run pm2:stop && npm run dev:clean`

**If clientId is undefined or wrong:**

- Copy-paste error from Spotify dashboard
- Extra whitespace or characters
- File encoding issues (should be UTF-8)

### 4. Test OAuth Flow

**Manual test:**

1. Open browser: http://127.0.0.1:3000/client/control
2. Click "Login with Spotify" button
3. Browser should redirect to Spotify authorization page
4. URL should be: `https://accounts.spotify.com/authorize?...`
5. After approving, you should redirect back to control panel
6. Control panel should show "Now Playing" instead of login button

**If redirect fails:**

Check browser console for errors:

```
F12 > Console tab
Look for errors containing "callback" or "spotify"
```

Check server logs:

```bash
npm run pm2:logs | grep -i spotify
```

### 5. Verify Token Delivery

After successful login, tokens should be delivered to the server:

```bash
# Check token manager status
curl http://127.0.0.1:3000/api/debug/spotify-token-status

# Expected output:
{
  "hasRefreshToken": true,
  "hasAccessToken": true,
  "tokenAge": "123 seconds",
  "willExpireIn": "3477 seconds"
}
```

**Check token file:**

```bash
cat logs/spotify_tokens.json
```

Should contain:

```json
{
  "refresh_token": "AQD...",
  "access_token": "BQC...",
  "expires_at": 1699534567890
}
```

**If tokens not saved:**

- Check `/api/internal/token-delivery` endpoint logs
- Verify `logs/` directory exists and is writable
- Check NextAuth callback in `lib/auth.ts` is calling token delivery

## Common Error Messages & Solutions

### Error: "Invalid client"

**Cause:** Spotify doesn't recognize your Client ID or Secret.

**Solutions:**

1. Regenerate Client Secret in Spotify dashboard
2. Copy-paste credentials again (no manual typing)
3. Check for invisible characters (use `cat -A .env.local`)
4. Verify Client ID length (should be 32 characters)

**Verification command:**

```bash
# Test with curl (replace with your credentials)
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "CLIENT_ID:CLIENT_SECRET" \
  -d "grant_type=client_credentials"

# Should return: {"access_token":"BQC...","token_type":"Bearer","expires_in":3600}
# If error: {"error":"invalid_client","error_description":"Invalid client"}
```

### Error: "Redirect URI mismatch"

**Cause:** The redirect URI in NextAuth doesn't match Spotify app settings.

**Solution:**

1. Go to Spotify Dashboard > Your App > Settings
2. Click "Edit Settings"
3. Under "Redirect URIs", add: `http://127.0.0.1:3000/api/auth/callback/spotify`
4. Click "Add"
5. Click "Save" at bottom of form
6. Wait 1-2 minutes for changes to propagate
7. Try login again

### Error: "CSRF token mismatch"

**Cause:** NextAuth session cookie issues or multiple browser tabs.

**Solution:**

1. Clear browser cookies for localhost
2. Close all tabs with the app
3. Restart server
4. Open fresh browser tab
5. Try login again

### Error: "Access token expired"

**Cause:** Token wasn't refreshed properly.

**Solution:**

Check token refresh mechanism:

```bash
# View token manager logs
npm run pm2:logs | grep "refreshToken"

# Check refresh token exists
curl http://127.0.0.1:3000/api/debug/spotify-token-status
```

The token should auto-refresh every 55 minutes. If not:

1. Check `services/spotifyTokenManager.ts` is loaded
2. Verify refresh token in `logs/spotify_tokens.json`
3. Check Spotify API isn't rate-limiting

## Testing Spotify Integration

### Manual Test Procedure

1. **Start fresh:**

   ```bash
   # Clear session
   rm -rf .next/cache
   npm run pm2:stop
   npm run dev:clean
   ```

2. **Test authentication:**

   ```bash
   # Should return valid config
   curl http://127.0.0.1:3000/api/debug/auth-check
   ```

3. **Test OAuth flow:**

   - Open http://127.0.0.1:3000/client/control
   - Click "Login with Spotify"
   - Approve on Spotify page
   - Should redirect back successfully

4. **Test token delivery:**

   ```bash
   # Should show tokens after login
   curl http://127.0.0.1:3000/api/debug/spotify-token-status
   ```

5. **Test playback control:**

   - Start playing music in Spotify (desktop or mobile)
   - Control panel should show "Now Playing"
   - Click Next/Previous/Play/Pause
   - Spotify should respond to commands

6. **Test token refresh:**
   ```bash
   # Wait 1 hour or manually expire token
   # Check logs for refresh activity
   npm run pm2:logs | grep "Token refreshed"
   ```

## Debug Endpoints Reference

All debug endpoints (only for development):

```bash
# Health check - verify server is running
curl http://127.0.0.1:3000/api/debug/ping

# Auth configuration - check credentials loaded
curl http://127.0.0.1:3000/api/debug/auth-check

# Session - check current NextAuth session
curl http://127.0.0.1:3000/api/debug/session

# Spotify token status - server-side token manager state
curl http://127.0.0.1:3000/api/debug/spotify-token-status

# Spotify token - current access token (requires login)
curl -H "Cookie: $(cat cookies.txt)" \
  http://127.0.0.1:3000/api/debug/spotify-token
```

## Environment Variable Template

Copy this to `.env.local` and fill in your values:

```bash
# =================================================================
# Spotify OAuth Configuration
# =================================================================
# Get these from: https://developer.spotify.com/dashboard
# 1. Create an app
# 2. Copy Client ID and Client Secret
# 3. Add redirect URI: http://127.0.0.1:3000/api/auth/callback/spotify
# =================================================================

SPOTIFY_CLIENT_ID=your_32_character_client_id
SPOTIFY_CLIENT_SECRET=your_32_character_client_secret

# =================================================================
# NextAuth Configuration
# =================================================================
# NEXTAUTH_URL must match the host you're accessing the app from
# Generate NEXTAUTH_SECRET with: openssl rand -base64 32
# =================================================================

NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# =================================================================
# Optional Configuration
# =================================================================

# Host binding (default: 127.0.0.1)
HOST=127.0.0.1

# Node environment (default: development)
NODE_ENV=development
```

## Still Having Issues?

If you've followed all steps and still see errors:

1. **Check Spotify API Status**

   - Visit: https://developer.spotify.com/status
   - Verify all services are operational

2. **Verify Spotify Account**

   - Ensure your Spotify account is active
   - Premium accounts work best for playback control
   - Free accounts can view "Now Playing" but may have limited control

3. **Test with Spotify's OAuth Examples**

   - Try Spotify's official OAuth example: https://github.com/spotify/web-api-examples
   - If that works but HRM doesn't, compare configurations

4. **Check Server Logs**

   ```bash
   # View all recent logs
   npm run pm2:logs

   # View specific log files
   tail -f logs/server-out.log
   tail -f logs/server-error.log
   ```

5. **Enable Verbose Logging**
   Add to `.env.local`:

   ```bash
   DEBUG=true
   NEXTAUTH_DEBUG=true
   ```

6. **Create Fresh Spotify App**
   - Sometimes app settings get corrupted
   - Create a completely new app in Spotify dashboard
   - Use the new credentials

## Success Indicators

You'll know Spotify integration is working when:

- ✅ Debug endpoint shows `spotifyConfigured: true`
- ✅ Login redirects to Spotify successfully
- ✅ After approval, redirects back to control panel
- ✅ Control panel displays current track name and artist
- ✅ Play/Pause button state matches Spotify playback
- ✅ Next/Previous buttons control Spotify
- ✅ Dashboard shows "Now Playing" updates every 5 seconds
- ✅ Token auto-refreshes without user intervention
- ✅ No "Invalid client" errors in logs

## Related Documentation

- [README.md](README.md) - Main project documentation
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details
- [lib/auth.ts](lib/auth.ts) - NextAuth configuration
- [services/spotifyTokenManager.ts](services/spotifyTokenManager.ts) - Token refresh logic
- [services/spotifyPolling.ts](services/spotifyPolling.ts) - API polling service
