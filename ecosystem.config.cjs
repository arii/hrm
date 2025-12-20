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
      // Pass critical environment variables from the calling environment.
      // This is especially important for CI/CD and testing environments.
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT,
        TESTING: process.env.TESTING,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT,
        TESTING: process.env.TESTING,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      },
    },
  ],
}
