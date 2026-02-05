#!/bin/bash
# ==============================================================================
# HRM Project - System Journal Vacuuming Script
# Decoupled utility to safely vacuum the system journal.
# ==============================================================================

set -e

echo "--- 🧹 VACUUMING SYSTEM JOURNAL ---"
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo."
  exit 1
fi

if command -v journalctl &> /dev/null; then
    echo "--- Vacuuming journalctl logs..."
    journalctl --vacuum-time=2d
else
    echo "--- journalctl not found, skipping..."
fi
echo "--- ✨ SYSTEM JOURNAL VACUUMING COMPLETE ---"
