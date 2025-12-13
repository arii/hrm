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
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET, // Pass NEXTAUTH_SECRET for auth
        NEXTAUTH_URL: process.env.NEXTAUTH_URL, // Pass NEXTAUTH_URL
      },
      // Redundant but kept for compatibility with existing scripts
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      },
    },
  ],
}
