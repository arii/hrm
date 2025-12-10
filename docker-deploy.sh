#!/bin/bash
set -e

APP_NAME="hrm-server"
VERSION=$(node -p "require('./package.json').version")

echo "🐳 Building Docker image for $APP_NAME v$VERSION..."

# 1. Build the image
docker build -t $APP_NAME:$VERSION -t $APP_NAME:latest .

# 2. Stop old container
echo "🛑 Stopping old container..."
docker stop $APP_NAME || true
docker rm $APP_NAME || true

# 3. Setup host logs directory
# This ensures the host directory exists and is writable by the container
echo "📁 Configuring persistent logs..."
mkdir -p logs
chmod 777 logs  # Ensure container user (node:1000) can write to it

echo "🚀 Starting new container..."

# 4. Run with Volume Mounts
# -v $(pwd)/logs:/app/logs -> Maps host logs to container logs
docker run -d \
  --name $APP_NAME \
  --init \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  -v "$(pwd)/logs:/app/logs" \
  $APP_NAME:latest

echo "✅ Deployed $APP_NAME v$VERSION"
echo "📊 View logs: docker logs -f $APP_NAME"
