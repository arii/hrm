/* eslint-env node */
module.exports = {
  apps: [
    {
      name: 'hrm-server',
      script: './.next/standalone/server.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // STRICT CHANGE: Default to production immediately
      env: {
        NODE_ENV: 'production',
      },
      // Redundant but kept for compatibility with existing scripts
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}