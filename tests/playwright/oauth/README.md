# OAuth Local Testing

This directory contains OAuth integration tests designed to run locally with existing browser sessions to verify Spotify authentication flows without manual intervention.

## Quick Start

### Prerequisites

1. **Active Spotify Session**: Log into Spotify via your preferred method (Facebook, Google, etc.) in your default Chrome browser
2. **Development Server**: Start the HRM development server
3. **Environment**: Ensure `.env.local` contains valid Spotify OAuth credentials

### Running OAuth Tests

**Option 1: Automated Setup (Recommended)**
```bash
# This script handles server checks, secrets provisioning, and test execution
npm run test:oauth:local
```

**Option 2: Direct Playwright Execution**
```bash
# Start server manually first
npm run dev

# Then run OAuth tests in another terminal
npm run test:oauth:playwright
```

**Option 3: Manual Configuration**
```bash
# Explicitly set environment variables
TEST_BASE_URL=http://localhost:3000 \
CHROME_PROFILE_PATH=/home/user/.config/google-chrome/Default \
SPOTIFY_EXPECTED_USER_ID=your_spotify_username \
npm run test:oauth:playwright
```

## Test Configuration

### Environment Variables

- `TEST_BASE_URL`: Application base URL (default: http://localhost:3000)
- `CHROME_PROFILE_PATH`: Path to Chrome profile with Spotify session (auto-detected if omitted)
- `SPOTIFY_EXPECTED_USER_ID`: Expected Spotify user ID for validation (optional)

### Browser Profile Detection

The test automatically detects Chrome profiles:
- **Linux**: `~/.config/google-chrome/Default`
- **macOS**: `~/Library/Application Support/Google/Chrome/Default`
- **Windows**: `%LOCALAPPDATA%\Google\Chrome\User Data\Default`

## Test Flow

1. **Session Validation**: Verifies existing Spotify session in browser
2. **OAuth Initiation**: Clicks login button and captures OAuth flow
3. **Callback Verification**: Ensures no "State cookie was missing" errors
4. **Token Exchange**: Validates successful token storage and refresh capability
5. **Integration Testing**: Tests WebSocket connectivity and API functionality

## Troubleshooting

### Common Issues

**"No active Spotify session found"**
- Log into Spotify manually in your default Chrome browser
- Ensure cookies are not cleared between sessions

**"State cookie was missing" error**
- This indicates the OAuth regression we're testing for
- Check server logs for detailed error information

**Chrome profile not found**
- Manually specify profile path: `CHROME_PROFILE_PATH=/path/to/profile npm run test:oauth:local`
- Or use a temporary profile (requires manual login)

**Server not running**
- Start dev server: `npm run dev`
- Verify server responds: `curl -I http://localhost:3000`

### Debug Mode

For detailed debugging, run tests with additional logging:
```bash
DEBUG=* npm run test:oauth:playwright
```

## Files

- `local-oauth.spec.ts`: Main OAuth test implementation
- `../scripts/verify_oauth_local.py`: Test orchestration script
- `../playwright.oauth.config.ts`: OAuth-specific Playwright configuration

## Design Philosophy

These tests use existing browser sessions rather than programmatic authentication to:
- Avoid Spotify API rate limits
- Test real-world OAuth flows
- Prevent automated detection by OAuth providers
- Enable reliable CI-independent verification

The tests are excluded from regular test runs to prevent CI failures due to missing browser sessions.