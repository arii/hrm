#!/bin/bash
export NODE_ENV=production
source .env.production
exec node dist/server.mjs