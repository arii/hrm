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
  echo "Please create .env.runner from .env.runner.example and configure it"
  exit 1
fi

# Load environment variables from .env.runner
echo "Loading configuration from .env.runner..."
set -a
source .env.runner
set +a

# Validate REPO_URL
if [ -z "$REPO_URL" ]; then
  echo "Error: REPO_URL is not set in .env.runner"
  exit 1
fi

# Function to generate runner token using GitHub CLI
generate_token_with_gh() {
  echo "Attempting to generate runner token using GitHub CLI..."
  
  # Extract owner and repo from URL
  REPO_OWNER=$(echo "$REPO_URL" | sed -n 's#.*/\([^/]*\)/\([^/]*\)$#\1#p')
  REPO_NAME=$(echo "$REPO_URL" | sed -n 's#.*/\([^/]*\)/\([^/]*\)$#\2#p')
  
  if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
    echo "Error: Could not parse repository owner and name from REPO_URL"
    return 1
  fi
  
  # Try using gh CLI
  if command -v gh &> /dev/null; then
    echo "Using GitHub CLI to generate token..."
    TOKEN=$(gh api --method POST \
      -H "Accept: application/vnd.github+json" \
      "/repos/$REPO_OWNER/$REPO_NAME/actions/runners/registration-token" \
      --jq '.token' 2>/dev/null)
    
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
      echo "✓ Token generated successfully using GitHub CLI"
      echo "$TOKEN"
      return 0
    fi
  fi
  
  return 1
}

# Function to generate runner token using PAT and curl
generate_token_with_pat() {
  if [ -z "$GITHUB_PAT" ]; then
    return 1
  fi
  
  echo "Attempting to generate runner token using GitHub PAT..."
  
  # Extract owner and repo from URL
  REPO_OWNER=$(echo "$REPO_URL" | sed -n 's#.*/\([^/]*\)/\([^/]*\)$#\1#p')
  REPO_NAME=$(echo "$REPO_URL" | sed -n 's#.*/\([^/]*\)/\([^/]*\)$#\2#p')
  
  if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
    echo "Error: Could not parse repository owner and name from REPO_URL"
    return 1
  fi
  
  # Try using curl with PAT
  RESPONSE=$(curl -s -L \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_PAT" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/runners/registration-token")
  
  TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✓ Token generated successfully using GitHub PAT"
    echo "$TOKEN"
    return 0
  fi
  
  return 1
}

# Determine runner token
if [ -n "$RUNNER_TOKEN" ]; then
  echo "Using RUNNER_TOKEN from .env.runner"
else
  echo "RUNNER_TOKEN not set, attempting to generate automatically..."
  
  # Try gh CLI first
  GENERATED_TOKEN=$(generate_token_with_gh)
  if [ $? -eq 0 ]; then
    RUNNER_TOKEN="$GENERATED_TOKEN"
  else
    # Try PAT if gh CLI failed
    GENERATED_TOKEN=$(generate_token_with_pat)
    if [ $? -eq 0 ]; then
      RUNNER_TOKEN="$GENERATED_TOKEN"
    else
      echo ""
      echo "Error: Could not generate runner token automatically."
      echo ""
      echo "Please either:"
      echo "  1. Set RUNNER_TOKEN in .env.runner (get from: GitHub Repo Settings → Actions → Runners → New self-hosted runner)"
      echo "  2. Authenticate with 'gh auth login' and re-run this script"
      echo "  3. Set GITHUB_PAT in .env.runner with a Personal Access Token that has 'repo' scope"
      exit 1
    fi
  fi
fi

# Final validation
if [ -z "$RUNNER_TOKEN" ]; then
  echo "Error: RUNNER_TOKEN is not available"
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

# Build docker run command with optional resource limits
DOCKER_RUN_CMD="docker run -d --restart unless-stopped --name hrm-runner"

# Add memory limit if specified
if [ -n "$RUNNER_MEMORY_LIMIT" ]; then
  echo "Setting memory limit: $RUNNER_MEMORY_LIMIT"
  DOCKER_RUN_CMD="$DOCKER_RUN_CMD --memory=$RUNNER_MEMORY_LIMIT"
fi

# Add CPU limit if specified
if [ -n "$RUNNER_CPU_LIMIT" ]; then
  echo "Setting CPU limit: $RUNNER_CPU_LIMIT"
  DOCKER_RUN_CMD="$DOCKER_RUN_CMD --cpus=$RUNNER_CPU_LIMIT"
fi

# Add environment variables and image
DOCKER_RUN_CMD="$DOCKER_RUN_CMD -e REPO_URL=\"$REPO_URL\" -e RUNNER_TOKEN=\"$RUNNER_TOKEN\" hrm-actions-runner"

# Execute the command
eval $DOCKER_RUN_CMD

echo ""
echo "✓ GitHub Actions Runner deployed successfully!"
echo ""
echo "Container name: hrm-runner"
echo "Repository: $REPO_URL"
echo ""
echo "View logs with: docker logs -f hrm-runner"
echo "Stop runner with: docker stop hrm-runner"
echo "Check status with: docker ps -a | grep hrm-runner"
