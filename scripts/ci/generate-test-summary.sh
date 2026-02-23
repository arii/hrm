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

SCRIPT_RESULT=$1
INFRA_RESULT=$2
UNIT_RESULT=$3
COMP_RESULT=$4
PERF_RESULT=$5
VISUAL_RESULT=$6

echo "### 📊 HRM Integration Test Summary" >> $GITHUB_STEP_SUMMARY
echo "| Test Suite | Status |" >> $GITHUB_STEP_SUMMARY
echo "| :--- | :--- |" >> $GITHUB_STEP_SUMMARY
echo "| **Script Tests** | $(get_status_icon "$SCRIPT_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Infrastructure Tests** | $(get_status_icon "$INFRA_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Unit Tests** | $(get_status_icon "$UNIT_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Component Tests** | $(get_status_icon "$COMP_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Performance Tests** | $(get_status_icon "$PERF_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Visual Tests** | $(get_status_icon "$VISUAL_RESULT") |" >> $GITHUB_STEP_SUMMARY
