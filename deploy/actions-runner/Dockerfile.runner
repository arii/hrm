# Use Ubuntu 22.04 as base for stability with GitHub Actions binaries
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# 1. Install system tools and Node.js prerequisites
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    git \
    sudo \
    tar \
    libicu-dev \
    build-essential \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Add GitHub CLI official repository and install gh
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
    gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
    tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && apt-get install -y gh

# 2. Install Node.js (aligned with your Next.js 16 / types/node requirements)
# Using NodeSource for the latest LTS (v20 or v22)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn pm2

# 3. Create a non-root user 'runner' (GitHub Runners should not run as root)
RUN useradd -m runner && \
    usermod -aG sudo runner && \
    echo "%sudo ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER runner
WORKDIR /home/runner

# 4. Download and Extract the GitHub Actions Runner (v2.329.0)
RUN mkdir actions-runner && cd actions-runner && \
    curl -o actions-runner-linux-x64-2.329.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.329.0/actions-runner-linux-x64-2.329.0.tar.gz && \
    tar xzf ./actions-runner-linux-x64-2.329.0.tar.gz && \
    rm actions-runner-linux-x64-2.329.0.tar.gz

# 5. Install Playwright System Dependencies
# We install these now so the runner is ready for 'npm run test:visual' immediately
# We temporarily use a dummy project to invoke install-deps
RUN cd /home/runner && \
    npm init -y && \
    npm install @playwright/test@1.56.1 && \
    npx playwright install-deps && \
    rm -rf package.json package-lock.json node_modules

# Copy the entrypoint script
COPY --chown=runner:runner entrypoint.sh /home/runner/entrypoint.sh
RUN sudo chmod +x /home/runner/entrypoint.sh

ENTRYPOINT ["/home/runner/entrypoint.sh"]
