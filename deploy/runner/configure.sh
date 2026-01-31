#!/bin/bash

# HRM GitHub Actions Runner - Interactive Configuration Script
# This script helps create a .env.runner file with interactive prompts

set -e

# Change to the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for better UX
if [ -t 1 ]; then
  BLUE='\033[0;34m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m' # No Color
else
  BLUE=''
  GREEN=''
  YELLOW=''
  NC=''
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HRM GitHub Actions Runner - Configuration Setup          ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check if .env.runner already exists
if [ -f .env.runner ]; then
  echo -e "${YELLOW}Warning: .env.runner already exists.${NC}"
  read -p "Do you want to overwrite it? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Configuration cancelled. Existing .env.runner preserved."
    exit 0
  fi
  echo ""
fi

# Function to prompt for input with default value
prompt_with_default() {
  local prompt="$1"
  local default="$2"
  local var_name="$3"
  local is_secret="${4:-false}"
  
  if [ -n "$default" ]; then
    echo -e "${BLUE}$prompt${NC}"
    echo -e "  ${GREEN}(default: $default)${NC}"
  else
    echo -e "${BLUE}$prompt${NC}"
  fi
  
  if [ "$is_secret" = "true" ]; then
    read -s -p "> " value
    echo ""
  else
    read -p "> " value
  fi
  
  if [ -z "$value" ]; then
    eval "$var_name='$default'"
  else
    eval "$var_name='$value'"
  fi
}

# Function to prompt yes/no
prompt_yes_no() {
  local prompt="$1"
  local default="$2"
  
  if [ "$default" = "y" ]; then
    read -p "$prompt [Y/n] " -n 1 -r
  else
    read -p "$prompt [y/N] " -n 1 -r
  fi
  echo
  
  if [ -z "$REPLY" ]; then
    [ "$default" = "y" ]
  else
    [[ $REPLY =~ ^[Yy]$ ]]
  fi
}

echo "═══════════════════════════════════════════════════════════"
echo "  Required Configuration"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Repository URL
prompt_with_default \
  "GitHub repository URL:" \
  "https://github.com/arii/hrm" \
  "REPO_URL"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Token Configuration (Optional)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "The runner needs a registration token. You have three options:"
echo "  1. Auto-generate using GitHub CLI (gh) - Recommended"
echo "  2. Auto-generate using Personal Access Token (PAT)"
echo "  3. Manually provide a runner token (expires in 1 hour)"
echo ""

# Check if gh CLI is available
GH_AVAILABLE=false
if command -v gh &> /dev/null; then
  if gh auth status &> /dev/null; then
    echo -e "${GREEN}✓ GitHub CLI (gh) is installed and authenticated${NC}"
    GH_AVAILABLE=true
  else
    echo -e "${YELLOW}! GitHub CLI (gh) is installed but not authenticated${NC}"
    echo "  Run 'gh auth login' to enable automatic token generation"
  fi
else
  echo "  GitHub CLI (gh) is not installed"
fi
echo ""

RUNNER_TOKEN=""
GITHUB_PAT=""

if [ "$GH_AVAILABLE" = true ]; then
  if prompt_yes_no "Use GitHub CLI for automatic token generation?" "y"; then
    echo -e "${GREEN}✓ Will use GitHub CLI to auto-generate tokens${NC}"
    RUNNER_TOKEN=""
    GITHUB_PAT=""
  else
    if prompt_yes_no "Do you want to provide a Personal Access Token (PAT)?" "n"; then
      echo ""
      echo "Generate a PAT at: https://github.com/settings/tokens"
      echo "Required scopes: 'repo' (or 'public_repo' for public repos)"
      echo ""
      prompt_with_default \
        "Personal Access Token:" \
        "" \
        "GITHUB_PAT" \
        "true"
    else
      if prompt_yes_no "Do you want to provide a manual runner token?" "n"; then
        echo ""
        echo "Get token from: GitHub Repo → Settings → Actions → Runners → New self-hosted runner"
        echo "Note: Tokens expire after 1 hour"
        echo ""
        prompt_with_default \
          "Runner token:" \
          "" \
          "RUNNER_TOKEN" \
          "true"
      fi
    fi
  fi
else
  if prompt_yes_no "Do you want to provide a Personal Access Token (PAT)?" "n"; then
    echo ""
    echo "Generate a PAT at: https://github.com/settings/tokens"
    echo "Required scopes: 'repo' (or 'public_repo' for public repos)"
    echo ""
    prompt_with_default \
      "Personal Access Token:" \
      "" \
      "GITHUB_PAT" \
      "true"
  else
    if prompt_yes_no "Do you want to provide a manual runner token?" "n"; then
      echo ""
      echo "Get token from: GitHub Repo → Settings → Actions → Runners → New self-hosted runner"
      echo "Note: Tokens expire after 1 hour"
      echo ""
      prompt_with_default \
        "Runner token:" \
        "" \
        "RUNNER_TOKEN" \
        "true"
    fi
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Resource Limits (Optional)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Recommended for production to prevent resource exhaustion"
echo ""

RUNNER_MEMORY_LIMIT=""
RUNNER_CPU_LIMIT=""

if prompt_yes_no "Configure resource limits?" "n"; then
  echo ""
  prompt_with_default \
    "Memory limit (e.g., 2g for 2GB, 512m for 512MB, leave empty for no limit):" \
    "" \
    "RUNNER_MEMORY_LIMIT"
  
  echo ""
  prompt_with_default \
    "CPU limit (e.g., 2 for 2 CPUs, 0.5 for half a CPU, leave empty for no limit):" \
    "" \
    "RUNNER_CPU_LIMIT"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Configuration summary:"
echo "  Repository: $REPO_URL"
if [ -n "$RUNNER_TOKEN" ]; then
  echo "  Runner token: [provided manually]"
elif [ -n "$GITHUB_PAT" ]; then
  echo "  GitHub PAT: [provided - will auto-generate tokens]"
else
  echo "  Token: [will auto-generate using GitHub CLI]"
fi
if [ -n "$RUNNER_MEMORY_LIMIT" ]; then
  echo "  Memory limit: $RUNNER_MEMORY_LIMIT"
fi
if [ -n "$RUNNER_CPU_LIMIT" ]; then
  echo "  CPU limit: $RUNNER_CPU_LIMIT"
fi
echo ""

if ! prompt_yes_no "Create .env.runner with this configuration?" "y"; then
  echo "Configuration cancelled."
  exit 0
fi

# Create .env.runner file
cat > .env.runner << EOF
# GitHub Actions Runner Configuration
# Generated by configure.sh on $(date)

# Required: The GitHub repository URL
REPO_URL=$REPO_URL

# Optional: Runner registration token (auto-generated if not provided)
# If not set, the script will attempt to generate it automatically using:
#   1. GitHub CLI (gh) if authenticated
#   2. GITHUB_PAT if provided below
# Get manually from: GitHub Repo Settings → Actions → Runners → New self-hosted runner
# Note: Tokens are short-lived (valid for 1 hour)
RUNNER_TOKEN=$RUNNER_TOKEN

# Optional: GitHub Personal Access Token for auto-generating runner token
# Required if gh CLI is not authenticated and RUNNER_TOKEN is not provided
# Must have 'repo' scope (or 'public_repo' for public repositories)
# Generate at: https://github.com/settings/tokens
GITHUB_PAT=$GITHUB_PAT

# Optional: Resource limits for the Docker container
# Recommended for production deployments to prevent resource exhaustion
# Memory limit (e.g., 2g for 2 gigabytes, 512m for 512 megabytes)
RUNNER_MEMORY_LIMIT=$RUNNER_MEMORY_LIMIT

# CPU limit (e.g., 2 for 2 CPUs, 0.5 for half a CPU)
RUNNER_CPU_LIMIT=$RUNNER_CPU_LIMIT
EOF

# Set restrictive permissions
chmod 600 .env.runner

echo ""
echo -e "${GREEN}✓ Configuration file created successfully!${NC}"
echo ""
echo "File: $(pwd)/.env.runner"
echo "Permissions: 600 (read/write for owner only)"
echo ""
echo "Next steps:"
echo "  1. Review the configuration: cat .env.runner"
echo "  2. Deploy the runner: ./deploy-runner.sh"
echo ""
