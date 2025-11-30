/* eslint-env node */
module.exports = {
  apps: [
    {
      name: 'hrm-server',
      script: './start-production.sh',
      interpreter: 'bash',
      instances: 1, // Or use 'max' for multi-core load balancing
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Development Environment (uses default port 3000, 127.0.0.1)
      env: {
        NODE_ENV: 'development',
        // NOTE: For local testing, ensure NEXTAUTH_URL is set in .env.local
      },
      // Production Environment Configuration
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000, // <--- 1. Set the application port
        // CRITICAL: This MUST be the full external URL with the port
        // This is the variable NextAuth uses to construct the redirect URI.
        NEXTAUTH_URL: 'http://YOUR_HOST_NAME:3000', // <--- 2. Set the full base URL
        // NextAuth mandates a secret in production
        NEXTAUTH_SECRET: 'YOUR_LONG_AND_SECURE_SECRET_STRING', // <--- 3. Mandatory NextAuth Secret
      },
    },
  ],
}
