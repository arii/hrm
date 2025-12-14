/* eslint-env node */
module.exports = {
  apps: [
    {
      name: 'hrm-server',
      script: './dist/server.mjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000, // Default port for production
      },
    },
  ],
};
