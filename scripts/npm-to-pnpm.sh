#!/bin/bash
# Auto-migrate npm commands to pnpm for HRM project

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing globally..."
    npm install -g pnpm
    echo "✅ pnpm installed successfully!"
fi

# Map common npm commands to pnpm equivalents
case "$1" in
    "install"|"i"|"add")
        echo "🔄 Converting 'npm $*' to 'pnpm install'"
        pnpm install "${@:2}"
        ;;
    "ci")
        echo "🔄 Converting 'npm ci' to 'pnpm install --frozen-lockfile'"
        pnpm install --frozen-lockfile
        ;;
    "run")
        echo "🔄 Converting 'npm run $2' to 'pnpm run $2'"
        pnpm run "${@:2}"
        ;;
    "start")
        echo "🔄 Converting 'npm start' to 'pnpm start'"
        pnpm start
        ;;
    "test")
        echo "🔄 Converting 'npm test' to 'pnpm test'"
        pnpm test
        ;;
    "build")
        echo "🔄 Converting 'npm run build' to 'pnpm run build'"
        pnpm run build
        ;;
    "dev")
        echo "🔄 Converting 'npm run dev' to 'pnpm run dev'"
        pnpm run dev
        ;;
    *)
        echo "🔄 Running: pnpm $*"
        pnpm "$@"
        ;;
esac