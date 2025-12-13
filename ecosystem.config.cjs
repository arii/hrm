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
      // STRICT CHANGE: Default to production immediately
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT, // Pass the PORT environment variable to the process
      },
      // Redundant but kept for compatibility with existing scripts
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT,
      },
    },
  ],
}
