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
    -   Create a `.env.runner` file in the `deploy/actions-runner` directory (if it doesn't exist) and fill in the following values:
        -   `GITHUB_REPO_URL`: The full URL to your repository (e.g., `https://github.com/your-username/your-repo`).
        -   `GITHUB_TOKEN`: A GitHub Personal Access Token (PAT). This token is used by the `gh` CLI inside the runner for actions like creating releases or commenting on pull requests. For enhanced security, use the most restrictive scope possible. The `workflow` scope is often sufficient for basic CI/CD operations. For more advanced interactions, you may need additional scopes like `repo` (for creating releases) or `pull_requests:write` (for commenting on pull requests).
        -   `RUNNER_TOKEN`: The token you generated in the previous step. This token is used only to register the runner with your repository.
        -   `RUNNER_NAME_SUFFIX` (Optional): A suffix to add to the runner's name for easier identification (e.g., `-prod-1`).
        -   `RUNNER_LABELS` (Optional): A comma-separated list of labels to assign to the runner (e.g., `hrm-backend,playwright,docker`).

3.  **Deploy the Runner:**
    -   Navigate to this directory (`deploy/actions-runner`).
    -   Run the `deploy.sh` script. You can specify the runner type as an argument:
        -   For the Playwright runner (default):
            ```bash
            bash deploy.sh playwright
            ```
        -   For the generic runner:
            ```bash
            bash deploy.sh generic
            ```
    -   The script will:
        -   Build the appropriate Docker image.
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

## Maintenance

### Docker Image Cleanup

Each time you run the `deploy.sh` script, a new Docker image is created. Over time, this can lead to an accumulation of old, unused images. To clean up dangling images, you can run the following command periodically:

```bash
docker image prune
```
