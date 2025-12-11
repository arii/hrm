#!/bin/bash
set -e

# Configuration
IMAGE_NAME="hrm-app"
CONTAINER_NAME="hrm-app"
HOST_PORT=3000
CONTAINER_PORT=3000
ENV_FILE=".env.production"
LOGS_DIR="logs"

# Ensure the logs directory exists on the host
mkdir -p $LOGS_DIR

# Build the Docker image
echo "Building Docker image: $IMAGE_NAME..."
docker build -t $IMAGE_NAME .

# Check if the container is running and stop/remove it
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Stopping and removing existing container: $CONTAINER_NAME..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
fi

# Run the new container
echo "Starting new container: $CONTAINER_NAME..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $HOST_PORT:$CONTAINER_PORT \
    --env-file $ENV_FILE \
    -v "$(pwd)/$LOGS_DIR":/usr/src/app/logs \
    --restart unless-stopped \
    $IMAGE_NAME

echo "✅ Deployment successful!"
echo "   Container '$CONTAINER_NAME' is running and accessible at http://localhost:$HOST_PORT"
