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
      // PM2 by default inherits the environment of the shell it's launched from.
      // By not defining `env` or `env_production`, we ensure that all variables
      // from the parent process (including those set in `test-with-server.sh`) are passed through.
    },
  ],
}
