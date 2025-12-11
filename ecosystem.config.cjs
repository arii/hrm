/* eslint-env node */
module.exports = {
  apps: [
    {
      name: 'hrm-server',
      script: 'dist/server.mjs',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
    },
  ],
}
