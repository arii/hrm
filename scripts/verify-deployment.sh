#!/bin/bash
# scripts/verify-deployment.sh
set -e

APP_NAME="hrm-server"
PORT="${PORT:-3000}" # Default to 3000 if not set
MAX_RETRIES=10
DELAY=2

echo "🔍 Verifying deployment health..."

# 1. Check PM2 Status
echo "Checking PM2 process status..."
if ! pm2 describe "$APP_NAME" > /dev/null; then
    echo "❌ Error: Process '$APP_NAME' does not exist in PM2."
    exit 1
fi

STATUS=$(pm2 jlist | grep -o "\"name\":\"$APP_NAME\".*\"pm2_env\":{.*\"status\":\"online\"")

if [ -z "$STATUS" ]; then
    echo "❌ Error: '$APP_NAME' is not online!"
    pm2 status "$APP_NAME"
    exit 1
fi
echo "✅ PM2 reports '$APP_NAME' is online."

# 2. Check HTTP Endpoint (with retries)
echo "Checking HTTP health at http://127.0.0.1:$PORT/api/debug/ping..."

count=0
while [ $count -lt $MAX_RETRIES ]; do
    # curl flags: -s (silent), -o (dev/null), -w (write out status code)
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/api/debug/ping || echo "000")

    if [ "$HTTP_STATUS" == "200" ]; then
        echo "✅ Health check passed! Endpoint returned 200 OK."
        exit 0
    fi

    echo "⏳ Attempt $((count+1))/$MAX_RETRIES: Got status $HTTP_STATUS. Retrying in ${DELAY}s..."
    sleep $DELAY
    count=$((count+1))
done

echo "❌ Deployment Verification Failed: App did not respond with 200 OK after $MAX_RETRIES attempts."
exit 1
