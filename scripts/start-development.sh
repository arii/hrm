#!/bin/bash
# Used for local development

export NODE_ENV=development
export TS_NODE_TRANSPILE_ONLY=true

# Load secrets strictly for the process scope
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# Explicitly run the server entry point with ts-node
exec node --loader ts-node/esm server.ts | pnpm exec pino-pretty
