#!/bin/bash

# Spotify Integration Health Check Script
# Verifies OAuth configuration, token status, and API functionality

set -e

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RESET="\033[0m"

RAW_PERSISTENCE=$(printf "%s" "${SPOTIFY_TOKEN_CACHE_STRATEGY:-${SPOTIFY_TOKEN_PERSISTENCE:-}}" | tr '[:upper:]' '[:lower:]')
if [ -n "$RAW_PERSISTENCE" ] && printf "%s" "$RAW_PERSISTENCE" | grep -Eq '^(persistent|persist|keep|retain|true|1)$'; then
    TOKEN_PERSISTENCE_MODE="persistent"
else
    TOKEN_PERSISTENCE_MODE="ephemeral"
fi

echo -e "${BOLD}Spotify Integration Health Check${RESET}"
echo "=================================="
echo ""

# Check if server is running
echo -e "${BOLD}1. Server Status${RESET}"
if curl -s --connect-timeout 2 "${BASE_URL}/api/debug/ping" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${RESET}"
else
    echo -e "${RED}✗ Server is not responding at ${BASE_URL}${RESET}"
    echo "  Start server with: npm run dev:clean"
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

if [ "$NEXT_AUTH" = "true" ]; then
    echo -e "${GREEN}✓ NextAuth configured${RESET}"
else
    echo -e "${RED}✗ NextAuth not configured${RESET}"
    echo "  Check NEXTAUTH_URL and NEXTAUTH_SECRET in .env.local"
fi

if [ "$SPOTIFY_CONFIG" = "true" ]; then
    echo -e "${GREEN}✓ Spotify provider configured${RESET}"
    echo "  Client ID: ${CLIENT_ID}"
else
    echo -e "${RED}✗ Spotify provider not configured${RESET}"
    echo "  Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local"
fi

if [ "$HAS_SECRET" = "true" ]; then
    echo -e "${GREEN}✓ Client secret present${RESET}"
else
    echo -e "${RED}✗ Client secret missing${RESET}"
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
elif [ "$TOKEN_PERSISTENCE_MODE" = "ephemeral" ]; then
    echo -e "${CYAN}ℹ Token cache is ephemeral; no file present by design${RESET}"
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
    echo -e "${YELLOW}⚠ No active session${RESET}"
    echo "  Login to test full integration"
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

# Consider it OK if tokens are in file, even if not in session
if [ "$HAS_ACCESS" != "true" ] && [ "$TOKEN_FILE_HAS_ACCESS" != "true" ]; then
    WARNINGS=$((WARNINGS + 1))
fi
if [ "$HAS_REFRESH" != "true" ] && [ "$TOKEN_FILE_HAS_REFRESH" != "true" ]; then
    WARNINGS=$((WARNINGS + 1))
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Spotify integration is fully operational.${RESET}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Configuration is valid but no tokens found.${RESET}"
    echo "  Login at: ${BASE_URL}/client/control"
    exit 0
else
    echo -e "${RED}✗ Configuration errors detected.${RESET}"
    echo "  Fix the issues above and re-run this script."
    exit 1
fi
