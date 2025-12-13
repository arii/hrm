# Use the official Node.js 20 image.
FROM mcr.microsoft.com/devcontainers/typescript-node:20-bullseye

# Install pnpm globally
RUN npm install -g pnpm

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and pnpm-lock.yaml to the working directory
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application source code to the working directory
COPY . .

# Use an ARG for the port, with a default value
ARG PORT=3000
# Set the ENV variable from the ARG
ENV PORT=$PORT
# Expose the port the app runs on
EXPOSE $PORT

# The command to run the application will be specified in the docker-compose.yml file
