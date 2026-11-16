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

INFRA_RESULT=$1
UNIT_RESULT=$2
COMP_RESULT=$3
PERF_RESULT=$4
VISUAL_RESULT=$5

echo "### 📊 HRM Integration Test Summary" >> $GITHUB_STEP_SUMMARY
echo "| Test Suite | Status |" >> $GITHUB_STEP_SUMMARY
echo "| :--- | :--- |" >> $GITHUB_STEP_SUMMARY
echo "| **Infrastructure Tests** | $(get_status_icon "$INFRA_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Unit Tests** | $(get_status_icon "$UNIT_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Component Tests** | $(get_status_icon "$COMP_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Performance Tests** | $(get_status_icon "$PERF_RESULT") |" >> $GITHUB_STEP_SUMMARY
echo "| **Visual Tests** | $(get_status_icon "$VISUAL_RESULT") |" >> $GITHUB_STEP_SUMMARY
