#!/bin/bash

# HRM GitHub Actions Runner - Systemd Service Installation Script
# This script installs the hrm-runner.service systemd unit

set -e

# Change to the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Detect the repository root (parent of deploy/runner)
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "HRM GitHub Actions Runner - Systemd Service Installation"
echo "========================================================="
echo ""
echo "Detected repository root: $REPO_ROOT"
echo "Service working directory: $SCRIPT_DIR"
echo ""

# Check if running with appropriate permissions
if [ "$EUID" -ne 0 ]; then 
  echo "This script requires root privileges to install systemd services."
  echo "Please run with sudo:"
  echo "  sudo ./install-service.sh"
  exit 1
fi

# Create a temporary service file with updated paths
SERVICE_FILE="/tmp/hrm-runner.service.tmp"
cp hrm-runner.service "$SERVICE_FILE"

# Replace placeholder paths with actual paths
sed -i "s|/path/to/hrm|$REPO_ROOT|g" "$SERVICE_FILE"

echo "Generated service file:"
echo "----------------------"
cat "$SERVICE_FILE"
echo "----------------------"
echo ""

# Confirm installation
read -p "Install this service to /etc/systemd/system/hrm-runner.service? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Installation cancelled."
  rm "$SERVICE_FILE"
  exit 0
fi

# Copy to systemd directory
cp "$SERVICE_FILE" /etc/systemd/system/hrm-runner.service
rm "$SERVICE_FILE"

# Reload systemd
echo "Reloading systemd daemon..."
systemctl daemon-reload

echo ""
echo "✓ Service installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Enable service: sudo systemctl enable hrm-runner.service"
echo "  2. Start service:  sudo systemctl start hrm-runner.service"
echo "  3. Check status:   sudo systemctl status hrm-runner.service"
echo "  4. View logs:      sudo journalctl -u hrm-runner.service -f"
