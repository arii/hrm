/* eslint-env node */
module.exports = {
  apps: [
    {
      name: 'hrm-server',
      script: './start-production.sh',
      interpreter: 'bash',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Pass environment variables to the script
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
    },
  ],
}
