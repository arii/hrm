#!/bin/bash
set -e

# This script is intended to be run on the host machine that will run the Docker container.

# 1. Build the Docker image
docker build -t hrm-actions-runner -f Dockerfile.runner .

# 2. Create and install the systemd service
# Note: This requires sudo privileges
sudo mkdir -p /etc/hrm-actions-runner
sudo cp .env.runner /etc/hrm-actions-runner/
sudo cp hrm-actions-runner.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hrm-actions-runner.service
sudo systemctl restart hrm-actions-runner.service

echo "GitHub Actions runner service started."
