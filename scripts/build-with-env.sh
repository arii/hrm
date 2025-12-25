#!/bin/bash
set -a
source .env.test
set +a
pnpm run build:server && next build
