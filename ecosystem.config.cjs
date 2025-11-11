const dotenv = require('dotenv');
const envConfig = dotenv.config({ path: '.env.production' }).parsed || {};

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
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        ...envConfig,
      },
    },
  ],
};
