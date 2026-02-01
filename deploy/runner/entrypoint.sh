#!/bin/bash
set -e

# HRM GitHub Actions Runner Entrypoint Script
# This script configures and starts a GitHub Actions self-hosted runner in a Docker container

# Provision SSH key at runtime if provided
if [ -n "$SSH_PRIVATE_KEY" ]; then
  echo "Provisioning SSH key..."
  mkdir -p /home/runner/.ssh
  echo "$SSH_PRIVATE_KEY" > /home/runner/.ssh/id_rsa
  chmod 700 /home/runner/.ssh
  chmod 600 /home/runner/.ssh/id_rsa

  # Add remote host to known_hosts to avoid interactive prompts
  if [ -n "$REMOTE_HOST" ]; then
    echo "Scanning remote host: $REMOTE_HOST"
    ssh-keyscan -H "$REMOTE_HOST" >> /home/runner/.ssh/known_hosts
  fi
  echo "SSH key provisioned successfully."
fi

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

# Set up cleanup handler to deregister runner on shutdown
cleanup() {
  echo "Shutting down runner..."
  if [ -f .runner ]; then
    echo "Deregistering runner from GitHub..."
    ./config.sh remove --token "${RUNNER_TOKEN}" || true
  fi
  exit 0
}

trap cleanup SIGTERM SIGINT

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
./run.sh &
wait $!

