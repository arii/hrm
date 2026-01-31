# GitHub Actions Self-Hosted Runner Setup

This directory contains the configuration and scripts to deploy a GitHub Actions self-hosted runner for the HRM project in a Docker container.

## Overview

The runner is deployed as a Docker container to ensure isolation, reproducibility, and easy management. This setup includes:

- **Dockerfile.runner**: Builds the runner image with all necessary dependencies
- **entrypoint.sh**: Configures and starts the runner inside the container
- **deploy-runner.sh**: Builds and deploys the Docker container
- **hrm-runner.service**: Systemd service file for automatic startup and management
- **.env.runner.example**: Template for configuration

## Prerequisites

- Docker installed and running
- Access to create self-hosted runners in the GitHub repository
- (For systemd service) Root or sudo access on the host machine

## Quick Start

### 1. Configure the Runner

Create a `.env.runner` file from the example:

```bash
cp .env.runner.example .env.runner
```

Edit `.env.runner` and set:

- `REPO_URL`: The GitHub repository URL (required, default: `https://github.com/arii/hrm`)
- `RUNNER_TOKEN`: Runner registration token (optional - auto-generated if not provided)
- `GITHUB_PAT`: GitHub Personal Access Token (optional - only needed if `gh` CLI is not authenticated)
- `RUNNER_MEMORY_LIMIT`: Memory limit for container (optional, e.g., `2g` for 2GB, recommended for production)
- `RUNNER_CPU_LIMIT`: CPU limit for container (optional, e.g., `2` for 2 CPUs, recommended for production)

#### Automatic Token Generation

The deployment script can automatically generate runner tokens in three ways (in order of preference):

1. **GitHub CLI (Recommended)**: If you have `gh` CLI installed and authenticated
   ```bash
   gh auth login
   ```

2. **Personal Access Token**: Set `GITHUB_PAT` in `.env.runner` with a token that has `repo` scope
   - Generate at: https://github.com/settings/tokens
   - Required scopes: `repo` (or `public_repo` for public repositories)

3. **Manual Token**: Set `RUNNER_TOKEN` in `.env.runner`
   - Get from: **Settings** → **Actions** → **Runners** → **New self-hosted runner**
   - **Note**: Tokens expire after 1 hour

If `RUNNER_TOKEN` is not provided, the script will automatically attempt methods 1 and 2.

### 2. Deploy the Runner Manually

Run the deployment script:

```bash
cd deploy/runner
./deploy-runner.sh
```

This script will:
1. Build the Docker image
2. Stop and remove any existing runner container
3. Start a new container with the configured settings

### 3. Verify the Runner

Check the container status:

```bash
docker ps -a | grep hrm-runner
```

View the runner logs:

```bash
docker logs -f hrm-runner
```

Verify in GitHub:
1. Go to: **Settings** → **Actions** → **Runners**
2. You should see your runner listed with status "Idle" or "Active"

## Systemd Service Setup (Optional but Recommended)

For automatic startup on system boot and better management, set up the systemd service.

### Automated Installation (Recommended)

Use the provided installation script to automatically configure paths:

```bash
sudo ./install-service.sh
```

This script will:
1. Detect the repository root path automatically
2. Update the service file with correct paths
3. Install the service to `/etc/systemd/system/`
4. Reload systemd daemon

After installation:

```bash
sudo systemctl enable hrm-runner.service
sudo systemctl start hrm-runner.service
```

### Manual Installation

If you prefer manual installation:

1. Edit `hrm-runner.service` and replace `/path/to/hrm` with the actual path to your repository:

```bash
# Example: If your repo is in /home/user/projects/hrm
sed -i 's|/path/to/hrm|/home/user/projects/hrm|g' hrm-runner.service
```

2. Copy the service file to systemd:

```bash
sudo cp hrm-runner.service /etc/systemd/system/
```

3. Reload systemd and enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hrm-runner.service
```

4. Start the service:

```bash
sudo systemctl start hrm-runner.service
```

### Managing the Service

Check status:
```bash
sudo systemctl status hrm-runner.service
```

View logs:
```bash
sudo journalctl -u hrm-runner.service -f
```

Restart the service:
```bash
sudo systemctl restart hrm-runner.service
```

Stop the service:
```bash
sudo systemctl stop hrm-runner.service
```

## Manual Container Management

If you're not using systemd, you can manage the container directly:

### Start the container
```bash
docker start hrm-runner
```

### Stop the container
```bash
docker stop hrm-runner
```

### Remove the container
```bash
docker stop hrm-runner
docker rm hrm-runner
```

### Rebuild and redeploy
```bash
./deploy-runner.sh
```

## Runner Features

The runner image includes:

- **GitHub Actions Runner**: v2.329.0
- **Node.js**: v22 (LTS)
- **pnpm**: For package management (as required by HRM)
- **PM2**: Process manager
- **GitHub CLI (gh)**: For GitHub API interactions
- **Playwright**: Browser automation framework with all system dependencies pre-installed
- **Build tools**: gcc, make, and other essential build tools

### Runner Labels

The runner is configured with the following labels:
- `hrm-backend`
- `playwright`
- `docker`

You can use these labels in your workflow files to target this specific runner:

```yaml
jobs:
  test:
    runs-on: [self-hosted, hrm-backend, playwright]
```

## Troubleshooting

### Runner not appearing in GitHub

1. Check the container logs:
   ```bash
   docker logs hrm-runner
   ```

2. Verify the token hasn't expired (tokens are valid for 1 hour)
3. Regenerate the token and redeploy

### Container exits immediately

Check the logs for error messages:
```bash
docker logs hrm-runner
```

Common issues:
- Missing or invalid `RUNNER_TOKEN`
- Missing or invalid `REPO_URL`
- Network connectivity issues

### Runner shows as "Offline" in GitHub

1. Check if the container is running:
   ```bash
   docker ps | grep hrm-runner
   ```

2. If not running, check the logs:
   ```bash
   docker logs hrm-runner
   ```

3. Restart the container:
   ```bash
   docker start hrm-runner
   ```

### Runner token expired

Runner tokens expire after 1 hour. If the token expires:

1. Generate a new token from GitHub (Settings → Actions → Runners)
2. Update `.env.runner` with the new token
3. Redeploy:
   ```bash
   ./deploy-runner.sh
   ```

The container uses `--restart unless-stopped` to prevent infinite restart loops when tokens expire.

### Cleanup orphaned runner registrations

If you have offline runners in GitHub that won't auto-cleanup:

1. Go to GitHub Settings → Actions → Runners
2. Find the offline runner
3. Click the three dots menu → Remove

Or, if you have the runner token, you can deregister manually:
```bash
docker exec -it hrm-runner bash
cd /home/runner/actions-runner
./config.sh remove --token YOUR_TOKEN
```

### Need to update the runner

1. Stop and remove the current container:
   ```bash
   docker stop hrm-runner
   docker rm hrm-runner
   ```

2. Update the Dockerfile.runner if needed (e.g., new runner version)

3. Redeploy:
   ```bash
   ./deploy-runner.sh
   ```

## Security Notes

- **Never commit `.env.runner`** - It contains sensitive tokens (already in `.gitignore`)
- Runner tokens expire after 1 hour for security
- Personal Access Tokens (PAT) do not expire automatically - store securely and rotate regularly
- The runner container runs as a non-root user (`runner`), but has sudo access (requires password)
- Consider using GitHub App authentication for long-lived runners in production
- Regularly update the runner version to get security patches
- The container restart policy is `unless-stopped` to prevent infinite restart loops when tokens expire

### Important Security Limitations

- **No Docker-in-Docker by default**: The container does not mount the Docker socket, so jobs that need to build Docker images will fail. If needed, add `-v /var/run/docker.sock:/var/run/docker.sock` to the docker run command, but be aware this grants significant privileges.
- **Resource limits**: Configure `RUNNER_MEMORY_LIMIT` and `RUNNER_CPU_LIMIT` in `.env.runner` to prevent resource exhaustion. Recommended for production deployments (e.g., `RUNNER_MEMORY_LIMIT=2g` and `RUNNER_CPU_LIMIT=2`).
- **Sudo access**: The runner user has sudo access (with password requirement). For maximum security, you may want to remove sudo access entirely if not needed by your workflows.
- **GitHub PAT Storage**: If using `GITHUB_PAT` for automatic token generation, ensure `.env.runner` file permissions are restrictive (`chmod 600 .env.runner`).

## Architecture

```
┌─────────────────────────────────────┐
│  Host Machine (systemd)             │
│  ┌───────────────────────────────┐  │
│  │  hrm-runner.service           │  │
│  │  (manages Docker container)   │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  hrm-runner container   │  │  │
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │ GitHub Actions    │  │  │  │
│  │  │  │ Runner Process    │  │  │  │
│  │  │  │ (run.sh)          │  │  │  │
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
         │
         │ Polls for jobs
         ▼
┌─────────────────────────────────────┐
│  GitHub Actions                     │
│  (github.com/arii/hrm)              │
└─────────────────────────────────────┘
```

## Files in This Directory

| File                     | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `Dockerfile.runner`      | Docker image definition for the runner            |
| `entrypoint.sh`          | Container entrypoint - configures and starts runner |
| `deploy-runner.sh`       | Deployment script - builds and runs the container, auto-generates token if needed, applies resource limits |
| `install-service.sh`     | Automated systemd service installation with path auto-detection |
| `.env.runner.example`    | Configuration template with REPO_URL, RUNNER_TOKEN, GITHUB_PAT, and resource limits |
| `hrm-runner.service`     | Systemd service definition (template)             |
| `README.md`              | This documentation                                |

## Related Documentation

- [GitHub Self-Hosted Runners Documentation](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Docker Documentation](https://docs.docker.com/)
- [systemd Service Documentation](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
