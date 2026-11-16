#!/bin/bash

# Function to get status icon
get_status_icon() {
  case "$1" in
    "success") echo "✅ Pass" ;;
    "failure") echo "❌ Fail" ;;
    "cancelled") echo "🛑 Cancelled" ;;
    "skipped") echo "⏭️ Skipped" ;;
    *) echo "❓ Unknown ($1)" ;;
  esac
}

UNIT_RESULT=$1
COMP_RESULT=$2
PERF_RESULT=$3
VISUAL_RESULT=$4

echo "### 📊 HRM Integration Test Summary" >> $GITHUB_STEP_SUMMARY
echo "| Test Suite | Status |" >> $GITHUB_STEP_SUMMARY
echo "| :--- | :--- |" >> $GITHUB_STEP_SUMMARY
echo "| **Unit Tests** | $(get_status_icon "$UNIT_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Component Tests** | $(get_status_icon "$COMP_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Performance Tests** | $(get_status_icon "$PERF_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Visual Tests** | $(get_status_icon "$VISUAL_RESULT") |" >> $GITHUB_STEP_SUMMARY
