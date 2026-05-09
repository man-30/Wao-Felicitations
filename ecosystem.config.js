module.exports = {
  apps: [
    {
      name: "waooo-api-prod",
      script: "./backend-express-complete.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      autorestart: true,
      max_restarts: 5,
      min_uptime: "10s",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      out_file: "/var/log/waooo-felicitations/out.log",
      error_file: "/var/log/waooo-felicitations/err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      kill_timeout: 5000,
      listen_timeout: 3000,
    },
  ],
};
