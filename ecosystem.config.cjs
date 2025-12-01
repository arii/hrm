/* eslint-env node */
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 1. Explicitly load the .env.production file
const envPath = path.resolve(__dirname, '.env.production');
let envConfig = {};

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    throw result.error;
  }
  envConfig = result.parsed;
}

module.exports = {
  apps: [
    {
      name: 'hrm-server',
      // 2. Point directly to your Node server file (NOT the bash script)
      script: 'dist/server.mjs',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        // 3. Spread the loaded variables here so they are available to the app
        ...envConfig,
      },
    },
  ],
}
