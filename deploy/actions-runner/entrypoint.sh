#!/bin/bash
set -e

# 1. Authenticate GH CLI using the PAT (Personal Access Token)
# The CLI automatically picks up the GITHUB_TOKEN env var, but we explicitly export it just in case

# HRM App Developer Note:
# Ensure REPO_URL and RUNNER_TOKEN are passed via docker run or docker-compose.

cd /home/runner/actions-runner

echo "Configuring GitHub Actions Runner..."

# --unattended: Don't ask for interaction
# --replace: Replace any existing runner with the same name
./config.sh --unattended \
  --url "${GITHUB_REPO_URL}" \
  --token "${RUNNER_TOKEN}" \
  --name "hrm-docker-runner-$(hostname)${RUNNER_NAME_SUFFIX}" \
  --work "_work" \
  --replace \
  --labels "${RUNNER_LABELS}"

echo "Starting Runner..."
# Runs the listener process
./run.sh
