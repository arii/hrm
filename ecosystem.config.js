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
      // Use ts-node in transpile-only mode so runtime type-checking doesn't
      // cause the PM2 process to exit on development type errors.
      interpreter: "./node_modules/.bin/ts-node",
      interpreter_args: "--transpile-only",
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
        script: "dist/server.js",
        interpreter: "node",
        interpreter_args: "",
        watch: false,
      },
      env_file: ".env.production",
    },
  ],
};
