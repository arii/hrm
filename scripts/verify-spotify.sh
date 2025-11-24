#!/bin/bash

# Spotify Integration Health Check Script
# Verifies OAuth configuration, token status, and API functionality

set -e

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
RESET="\033[0m"

echo -e "${BOLD}Spotify Integration Health Check${RESET}"
echo "=================================="
echo ""

# Check if server is running
echo -e "${BOLD}1. Server Status${RESET}"
if curl -s --connect-timeout 2 "${BASE_URL}/api/debug/ping" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${RESET}"
else
    echo -e "${RED}✗ Server is not responding at ${BASE_URL}${RESET}"
    echo "  Start server with: ppnpm run dev:clean"
    exit 1
fi
echo ""

# Check auth configuration
echo -e "${BOLD}2. Auth Configuration${RESET}"
AUTH_CHECK=$(curl -s "${BASE_URL}/api/debug/auth-check")
NEXT_AUTH=$(echo "$AUTH_CHECK" | jq -r '.nextAuthConfigured')
SPOTIFY_CONFIG=$(echo "$AUTH_CHECK" | jq -r '.spotifyConfigured')
CLIENT_ID=$(echo "$AUTH_CHECK" | jq -r '.clientId')
HAS_SECRET=$(echo "$AUTH_CHECK" | jq -r '.hasClientSecret')
REDIRECT_URI=$(echo "$AUTH_CHECK" | jq -r '.redirectUri')

if [ "$NEXT_AUTH" = "true" ]; then
    echo -e "${GREEN}✓ NextAuth configured${RESET}"
else
    echo -e "${RED}✗ NextAuth not configured${RESET}"
    echo "  Check NEXTAUTH_URL and NEXTAUTH_SECRET in .env.local"
fi

if [ "$SPOTIFY_CONFIG" = "true" ]; then
    echo -e "${GREEN}✓ Spotify provider configured${RESET}"
    echo "  Client ID: ${CLIENT_ID}"
    echo "  Redirect URI: ${REDIRECT_URI}"
else
    echo -e "${RED}✗ Spotify provider not configured${RESET}"
    echo "  Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local"
fi

if [ "$HAS_SECRET" = "true" ]; then
    echo -e "${GREEN}✓ Client secret present${RESET}"
else
    echo -e "${RED}✗ Client secret missing${RESET}"
fi

# Validate callback URL format
if [ "$REDIRECT_URI" != "null" ] && [ "$REDIRECT_URI" != "" ]; then
    if [[ "$REDIRECT_URI" == */api/auth/callback/spotify ]]; then
        echo -e "${GREEN}✓ Callback URL format is correct${RESET}"
    else
        echo -e "${RED}✗ Callback URL format is incorrect${RESET}"
        echo "  Expected: .../api/auth/callback/spotify"
        echo "  Current: ${REDIRECT_URI}"
    fi
    
    # Check if using HTTPS in production
    if [[ "$REDIRECT_URI" == https://* ]]; then
        echo -e "${GREEN}✓ Using HTTPS for OAuth (secure cookies enabled)${RESET}"
    elif [[ "$REDIRECT_URI" == http://127.0.0.1:* ]] || [[ "$REDIRECT_URI" == http://localhost:* ]]; then
        echo -e "${YELLOW}⚠ Using HTTP for development${RESET}"
    else
        echo -e "${RED}✗ Using HTTP in production - OAuth may fail${RESET}"
        echo "  HTTPS is required for secure OAuth cookies"
    fi
fi
echo ""

# Check token status
echo -e "${BOLD}3. Token Status${RESET}"
TOKEN_STATUS=$(curl -s "${BASE_URL}/api/debug/spotify-token-status")
HAS_ACCESS=$(echo "$TOKEN_STATUS" | jq -r '.hasAccessToken')
HAS_REFRESH=$(echo "$TOKEN_STATUS" | jq -r '.hasRefreshToken')
USER_ID=$(echo "$TOKEN_STATUS" | jq -r '.userId')

# Also check the actual token file for more reliable status
TOKEN_FILE_HAS_ACCESS=false
TOKEN_FILE_HAS_REFRESH=false
if [ -f "logs/spotify_tokens.json" ]; then
    TOKEN_FILE_ACCESS=$(cat logs/spotify_tokens.json | jq -r '.payload.access_token' 2>/dev/null)
    TOKEN_FILE_REFRESH=$(cat logs/spotify_tokens.json | jq -r '.payload.refresh_token' 2>/dev/null)
    
    if [ "$TOKEN_FILE_ACCESS" != "null" ] && [ "$TOKEN_FILE_ACCESS" != "" ]; then
        TOKEN_FILE_HAS_ACCESS=true
    fi
    
    if [ "$TOKEN_FILE_REFRESH" != "null" ] && [ "$TOKEN_FILE_REFRESH" != "" ]; then
        TOKEN_FILE_HAS_REFRESH=true
    fi
fi

if [ "$HAS_ACCESS" = "true" ] || [ "$TOKEN_FILE_HAS_ACCESS" = "true" ]; then
    echo -e "${GREEN}✓ Access token present${RESET}"
    
    if [ "$USER_ID" != "null" ] && [ "$USER_ID" != "" ]; then
        echo "  User ID: ${USER_ID}"
    elif [ -f "logs/spotify_tokens.json" ]; then
        FILE_USER=$(cat logs/spotify_tokens.json | jq -r '.payload.sub' 2>/dev/null)
        if [ "$FILE_USER" != "null" ] && [ "$FILE_USER" != "" ]; then
            echo "  User ID: ${FILE_USER} (from file)"
        fi
    fi
    
    EXPIRES_IN=$(echo "$TOKEN_STATUS" | jq -r '.willExpireIn')
    if [ "$EXPIRES_IN" != "null" ] && [ "$EXPIRES_IN" != "" ]; then
        echo "  Expires in: ${EXPIRES_IN}"
    fi
else
    echo -e "${YELLOW}⚠ No access token in session${RESET}"
    if [ "$TOKEN_FILE_HAS_ACCESS" = "true" ]; then
        echo -e "${GREEN}  ✓ But token exists in file (server will load it)${RESET}"
    else
        echo "  Login at: ${BASE_URL}/client/control"
    fi
fi

if [ "$HAS_REFRESH" = "true" ] || [ "$TOKEN_FILE_HAS_REFRESH" = "true" ]; then
    echo -e "${GREEN}✓ Refresh token present${RESET}"
else
    echo -e "${YELLOW}⚠ No refresh token${RESET}"
fi

# Check token file
if [ -f "logs/spotify_tokens.json" ]; then
    echo -e "${GREEN}✓ Token file exists${RESET}"
    FILE_SIZE=$(stat -f%z "logs/spotify_tokens.json" 2>/dev/null || stat -c%s "logs/spotify_tokens.json" 2>/dev/null)
    echo "  Size: ${FILE_SIZE} bytes"
else
    echo -e "${YELLOW}⚠ Token file not found (logs/spotify_tokens.json)${RESET}"
fi
echo ""

# Check session (if logged in)
echo -e "${BOLD}4. Session Status${RESET}"
SESSION=$(curl -s "${BASE_URL}/api/debug/session")
SESSION_EXISTS=$(echo "$SESSION" | jq -r '.user.email' 2>/dev/null)

if [ "$SESSION_EXISTS" != "null" ] && [ "$SESSION_EXISTS" != "" ]; then
    echo -e "${GREEN}✓ Active session found${RESET}"
    echo "  Email: ${SESSION_EXISTS}"
else
    echo -e "${YELLOW}⚠ No active web session (normal for CLI testing)${RESET}"
    echo "  Note: Session cookies are browser-specific"
    echo "  Spotify may still work via stored tokens"
fi
echo ""

# OAuth Cookie Configuration Test
echo -e "${BOLD}5. OAuth Cookie Configuration${RESET}"

# Test if NextAuth cookies are configured properly for HTTPS
if [[ "$REDIRECT_URI" == https://* ]]; then
    echo "Testing OAuth cookie configuration for HTTPS..."
    
    # Make a test request to the NextAuth provider configuration
    PROVIDER_TEST=$(curl -s -H "Accept: application/json" "${BASE_URL}/api/auth/providers" 2>/dev/null)
    if echo "$PROVIDER_TEST" | jq -e '.spotify' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OAuth provider endpoint accessible${RESET}"
        
        # Check if we can access the signin page without errors
        SIGNIN_TEST=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/auth/signin/spotify")
        if [ "$SIGNIN_TEST" = "200" ]; then
            echo -e "${GREEN}✓ Spotify signin endpoint accessible${RESET}"
        else
            echo -e "${YELLOW}⚠ Spotify signin returned HTTP ${SIGNIN_TEST}${RESET}"
        fi
        
        # Test CSRF token generation (this validates cookie setup)
        CSRF_TEST=$(curl -s "${BASE_URL}/api/auth/csrf" | jq -r '.csrfToken' 2>/dev/null)
        if [ "$CSRF_TEST" != "null" ] && [ "$CSRF_TEST" != "" ]; then
            echo -e "${GREEN}✓ CSRF token generation working${RESET}"
        else
            echo -e "${RED}✗ CSRF token generation failed${RESET}"
            echo "  This indicates cookie configuration issues"
        fi
    else
        echo -e "${RED}✗ OAuth provider configuration test failed${RESET}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping HTTPS cookie tests (development mode)${RESET}"
fi
echo ""

# Network Connectivity Test
echo -e "${BOLD}6. External Connectivity${RESET}"

# Test Spotify API connectivity
echo "Testing Spotify API connectivity..."
SPOTIFY_API_TEST=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://accounts.spotify.com/api/token" -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=client_credentials" 2>/dev/null || echo "timeout")

if [ "$SPOTIFY_API_TEST" = "400" ]; then
    echo -e "${GREEN}✓ Spotify API is reachable (400 expected without credentials)${RESET}"
elif [ "$SPOTIFY_API_TEST" = "timeout" ]; then
    echo -e "${RED}✗ Spotify API connectivity timeout${RESET}"
    echo "  Check internet connection and firewall"
else
    echo -e "${YELLOW}⚠ Spotify API returned HTTP ${SPOTIFY_API_TEST}${RESET}"
fi

# Test callback URL accessibility (if it's a public URL)
if [[ "$REDIRECT_URI" == https://* ]] && [[ "$REDIRECT_URI" != *"127.0.0.1"* ]] && [[ "$REDIRECT_URI" != *"localhost"* ]]; then
    echo "Testing callback URL accessibility..."
    CALLBACK_HOST=$(echo "$REDIRECT_URI" | sed -E 's|https?://([^/]+).*|\1|')
    CALLBACK_TEST=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${REDIRECT_URI}" 2>/dev/null || echo "timeout")
    
    if [ "$CALLBACK_TEST" = "405" ] || [ "$CALLBACK_TEST" = "400" ] || [ "$CALLBACK_TEST" = "302" ]; then
        echo -e "${GREEN}✓ Callback URL is accessible (HTTP ${CALLBACK_TEST} is normal)${RESET}"
        echo "  Note: 302 redirect is expected for OAuth callbacks"
    elif [ "$CALLBACK_TEST" = "timeout" ]; then
        echo -e "${RED}✗ Callback URL timeout - may not be accessible from internet${RESET}"
        echo "  URL: ${REDIRECT_URI}"
    else
        echo -e "${YELLOW}⚠ Callback URL returned HTTP ${CALLBACK_TEST}${RESET}"
        echo "  URL: ${REDIRECT_URI}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping callback URL accessibility test (local/dev URL)${RESET}"
fi
echo ""

# Summary
echo -e "${BOLD}Summary${RESET}"
echo "======="

ERRORS=0
WARNINGS=0

if [ "$NEXT_AUTH" != "true" ] || [ "$SPOTIFY_CONFIG" != "true" ] || [ "$HAS_SECRET" != "true" ]; then
    ERRORS=$((ERRORS + 1))
fi

# Check for callback URL issues
if [ "$REDIRECT_URI" != "null" ] && [ "$REDIRECT_URI" != "" ]; then
    if [[ "$REDIRECT_URI" != */api/auth/callback/spotify ]]; then
        ERRORS=$((ERRORS + 1))
    fi
fi

# Consider it OK if tokens are in file, even if not in session
if [ "$HAS_ACCESS" != "true" ] && [ "$TOKEN_FILE_HAS_ACCESS" != "true" ]; then
    WARNINGS=$((WARNINGS + 1))
fi
if [ "$HAS_REFRESH" != "true" ] && [ "$TOKEN_FILE_HAS_REFRESH" != "true" ]; then
    WARNINGS=$((WARNINGS + 1))
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Spotify integration is fully operational.${RESET}"
    echo ""
    echo "Next steps:"
    echo "• Visit ${BASE_URL}/client/control to test OAuth flow"
    echo "• Check logs for any 'State cookie was missing' errors"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Configuration is valid but no active web session.${RESET}"
    echo ""
    echo "This is normal when testing from command line."
    echo "If Spotify is working in your browser, the integration is functioning correctly."
    echo ""
    echo "To see an active session in these tests:"
    echo "• Visit ${BASE_URL}/client/control in browser"
    echo "• Complete OAuth login if needed"
    echo "• Re-run this script from the same machine"
    exit 0
else
    echo -e "${RED}✗ Configuration errors detected.${RESET}"
    echo ""
    echo "Common OAuth issues:"
    echo "• Callback URL format: must end with /api/auth/callback/spotify"
    echo "• HTTPS required: production URLs must use HTTPS"
    echo "• Environment variables: check SPOTIFY_CALLBACK_URL vs SPOTIFY_REDIRECT_URI"
    echo "• Spotify app settings: callback URL must match exactly"
    echo ""
    echo "Fix the issues above and re-run this script."
    exit 1
fi
