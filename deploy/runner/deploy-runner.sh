#!/bin/bash

# HRM GitHub Actions Runner Deployment Script
# This script builds and deploys the GitHub Actions runner in a Docker container

set -e

# Change to the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if .env.runner file exists
if [ ! -f .env.runner ]; then
  echo "Error: .env.runner file not found"
  echo "Please create .env.runner from .env.runner.example and configure your tokens"
  exit 1
fi

# Load environment variables from .env.runner
echo "Loading configuration from .env.runner..."
export $(grep -v '^#' .env.runner | xargs)

# Validate required environment variables
if [ -z "$RUNNER_TOKEN" ]; then
  echo "Error: RUNNER_TOKEN is not set in .env.runner"
  echo "Get a token from: GitHub Repo Settings -> Actions -> Runners -> New self-hosted runner"
  exit 1
fi

if [ -z "$REPO_URL" ]; then
  echo "Error: REPO_URL is not set in .env.runner"
  exit 1
fi

# Build the Docker image
echo "Building GitHub Actions Runner Docker image..."
docker build -t hrm-actions-runner -f Dockerfile.runner .

# Stop and remove existing container if it exists
if docker ps -a --format '{{.Names}}' | grep -q '^hrm-runner$'; then
  echo "Stopping and removing existing hrm-runner container..."
  docker stop hrm-runner || true
  docker rm hrm-runner || true
fi

# Run the container
echo "Starting GitHub Actions Runner container..."
docker run -d --restart always \
  --name hrm-runner \
  -e REPO_URL="$REPO_URL" \
  -e RUNNER_TOKEN="$RUNNER_TOKEN" \
  hrm-actions-runner

echo ""
echo "✓ GitHub Actions Runner deployed successfully!"
echo ""
echo "Container name: hrm-runner"
echo "Repository: $REPO_URL"
echo ""
echo "View logs with: docker logs -f hrm-runner"
echo "Stop runner with: docker stop hrm-runner"
echo "Check status with: docker ps -a | grep hrm-runner"
