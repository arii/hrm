/**
 * PM2 ecosystem file for HRM
 * - Defines development and production process configs.
 * - Uses the local ts-node interpreter so TypeScript files can be run directly.
 */
module.exports = {
  apps: [
    {
      name: "hrm-server",
      script: "server.ts",
      interpreter: "./node_modules/.bin/ts-node",
      // interpreterArgs: '--transpile-only',
      watch: ["server.ts", "services", "utils", "app"],
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      // Log files (relative to repository root)
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "development",
        HOST: "127.0.0.1",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 3000,
      },
    },
  ],
};
