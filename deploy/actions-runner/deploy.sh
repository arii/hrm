#!/bin/bash
set -e

# This script is intended to be run on the host machine that will run the Docker container.
RUNNER_VERSION="2.317.0"
RUNNER_TYPE=${1:-playwright} # Default to playwright if no argument is provided

# 1. Build the Docker image
if [ "$RUNNER_TYPE" = "playwright" ]; then
  docker build --build-arg RUNNER_VERSION=${RUNNER_VERSION} -t hrm-actions-runner-generic -f Dockerfile.runner-generic .
  docker build -t hrm-actions-runner -f Dockerfile.runner .
else
  docker build --build-arg RUNNER_VERSION=${RUNNER_VERSION} -t hrm-actions-runner -f Dockerfile.runner-generic .
fi

# 2. Create and install the systemd service
# Note: This requires sudo privileges
sudo mkdir -p /etc/hrm-actions-runner
sudo cp .env.runner /etc/hrm-actions-runner/
sudo chmod 600 /etc/hrm-actions-runner/.env.runner
sudo cp hrm-actions-runner.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hrm-actions-runner.service
sudo systemctl restart hrm-actions-runner.service

echo "GitHub Actions runner service started."
