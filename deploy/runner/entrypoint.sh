#!/bin/bash
set -e

# HRM GitHub Actions Runner Entrypoint Script
# This script configures and starts a GitHub Actions self-hosted runner in a Docker container

# Ensure REPO_URL and RUNNER_TOKEN are passed via environment variables
if [ -z "$REPO_URL" ]; then
  echo "Error: REPO_URL environment variable is not set"
  exit 1
fi

if [ -z "$RUNNER_TOKEN" ]; then
  echo "Error: RUNNER_TOKEN environment variable is not set"
  echo "Get a token from: GitHub Repo Settings -> Actions -> Runners -> New self-hosted runner"
  exit 1
fi

cd /home/runner/actions-runner

echo "Configuring GitHub Actions Runner..."
echo "Repository: ${REPO_URL}"
echo "Runner name: hrm-docker-runner-$(hostname)"

# Configure the runner
# --unattended: Don't ask for interaction
# --replace: Replace any existing runner with the same name
./config.sh --unattended \
  --url "${REPO_URL}" \
  --token "${RUNNER_TOKEN}" \
  --name "hrm-docker-runner-$(hostname)" \
  --work "_work" \
  --replace \
  --labels "hrm-backend,playwright,docker"

echo "Starting GitHub Actions Runner..."
# Runs the listener process
./run.sh
