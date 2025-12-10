# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Server (tsc) and Next.js App
# This runs your "build" script: "tsc -p tsconfig.build.json && next build"
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install PM2 globally to manage the process inside the container
RUN npm install -g pm2

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built artifacts from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/ecosystem.config.cjs ./ecosystem.config.cjs

# Setup persistent logs directory with correct permissions
RUN mkdir -p logs && chown -R node:node logs

# Use non-root user for security
USER node

# Expose the application port
EXPOSE 3000

# Start application using PM2 Runtime (Foreground mode for Docker)
CMD ["pm2-runtime", "start", "ecosystem.config.cjs", "--env", "production"]