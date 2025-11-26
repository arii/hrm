#!/bin/bash
# Production deployment script for HRM Next.js app

set -e

# --- SAFETY CHECK ---
git fetch --tags
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "none")
CURRENT_VER=$(node -p "require('./package.json').version")

if [[ "v$CURRENT_VER" != "$LATEST_TAG" ]]; then
    echo "⚠️  WARNING: Mismatch detected! Version: v$CURRENT_VER, Tag: $LATEST_TAG"
    echo "    You are deploying untagged code."
    read -p "    Are you sure you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled."
        exit 1
    fi
fi

echo "🚀 Starting HRM production deployment..."

# Check for .env.production
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with:"
    echo "  NEXTAUTH_URL=https://your-domain.com"
    echo "  NEXTAUTH_SECRET=your-secret-here"
    echo "  SPOTIFY_CLIENT_ID=your-client-id"
    echo "  SPOTIFY_CLIENT_SECRET=your-client-secret"
    exit 1
fi

# Check if nginx is configured (skip if no sudo access)
if ! command -v nginx &> /dev/null; then
    echo "⚠️  Warning: nginx not found. Make sure it's installed and configured."
else
    if sudo -n true 2>/dev/null; then
        if ! sudo nginx -t &> /dev/null; then
            echo "❌ Error: nginx configuration test failed!"
            echo "Please check your nginx configuration."
            exit 1
        fi
    else
        echo "⚠️  Warning: Cannot test nginx configuration (no sudo access). Proceeding..."
    fi
fi

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Build the application
echo "📦 Building Next.js application..."
pnpm run build

# Stop and delete existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pnpm run pm2:delete || true

# Start with production environment
echo "▶️ Starting HRM server with PM2..."
pnpm run start

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

echo "✅ Deployment complete!"
echo "📊 Check status with: pm2 status"
echo "📝 View logs with: pnpm run pm2:logs"