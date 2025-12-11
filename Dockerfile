# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Install pm2
RUN npm install -g pm2

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy built application from builder stage
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/ecosystem.config.cjs ./

EXPOSE 3000

# Start the application
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
