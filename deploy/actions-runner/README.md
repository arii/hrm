# GitHub Actions Runner Deployment

This directory contains the necessary files to build and deploy a self-hosted GitHub Actions runner in a Docker container, managed by a `systemd` service.

## Files

-   `Dockerfile.runner`: The Dockerfile used to build the runner image.
-   `entrypoint.sh`: The entrypoint script for the Docker container, which configures and starts the runner.
-   `deploy.sh`: A script to be run on the host machine to build the Docker image and set up the `systemd` service.
-   `hrm-actions-runner.service`: The `systemd` unit file that defines the runner service.
-   `.env.runner`: An environment file template for storing the GitHub Actions runner token.

## Version Management

The version of the GitHub Actions runner is managed by the `RUNNER_VERSION` variable in `deploy.sh`. To update the runner, change this variable to the desired version tag (e.g., "2.317.0"). This version is passed as a build argument to the Dockerfile.

## Prerequisites

-   Docker is installed and running on the host machine.
-   The user running the `deploy.sh` script has `sudo` privileges.

## Setup Instructions

1.  **Create a GitHub Actions Runner Token:**
    -   Navigate to your repository's settings on GitHub: `Settings > Actions > Runners`.
    -   Click "New self-hosted runner".
    -   Follow the instructions to create a new runner, and copy the generated token.

2.  **Configure the Environment:**
    -   Copy the `.env.runner` file to a new file named `.env.runner` (if it doesn't exist).
    -   Open `.env.runner` and fill in the following values:
        -   `GITHUB_REPO_URL`: The full URL to your repository (e.g., `https://github.com/your-username/your-repo`).
        -   `GITHUB_TOKEN`: A GitHub Personal Access Token (PAT). The `repo` scope is a common choice for broad access, but for enhanced security, use the most restrictive scope that meets your workflow needs (e.g., `workflow` for running jobs).
        -   `RUNNER_TOKEN`: The token you generated in the previous step.

3.  **Deploy the Runner:**
    -   Navigate to this directory (`deploy/actions-runner`).
    -   Run the `deploy.sh` script:
        ```bash
        bash deploy.sh
        ```
    -   The script will:
        -   Build the Docker image.
        -   Create the `/etc/hrm-actions-runner` directory.
        -   Copy the `.env.runner` file to `/etc/hrm-actions-runner/`.
        -   Copy the `hrm-actions-runner.service` file to `/etc/systemd/system/`.
        -   Reload the `systemd` daemon.
        -   Enable and start the `hrm-actions-runner` service.

4.  **Verify the Runner:**
    -   Check the status of the service:
        ```bash
        systemctl status hrm-actions-runner
        ```
    -   You can also check the logs of the service:
        ```bash
        journalctl -u hrm-actions-runner -f
        ```
    -   Finally, go back to your repository's `Settings > Actions > Runners` page on GitHub to see the new runner with a "Ready" status.
