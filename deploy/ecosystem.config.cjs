/* eslint-env node */
module.exports = {
  apps: [
    {
      name: 'hrm-server',
      script: './scripts/start-production.sh',
      interpreter: 'bash',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Pass PORT from the environment, otherwise it will be undefined
      // and the application can decide on a default.
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT,
        SPOTIFY_CLIENT_ID: 'test_client_id',
        SPOTIFY_CLIENT_SECRET: 'test_client_secret',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT,
        SPOTIFY_CLIENT_ID: 'test_client_id',
        SPOTIFY_CLIENT_SECRET: 'test_client_secret',
      },
    },
  ],
}
