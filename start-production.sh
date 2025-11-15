#!/bin/bash
export NODE_ENV=production

# Export all variables defined in .env.production to child processes
set -a
source .env.production
set +a

exec node dist/server.mjs