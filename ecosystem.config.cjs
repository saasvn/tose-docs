/**
 * PM2 Ecosystem Configuration for Docs
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'docs',
      script: 'npx',
      args: 'serve .vitepress/dist -l 4173 -s',
      cwd: '/home/deploy/tose-docs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4173
      },
      error_file: './logs/docs-error.log',
      out_file: './logs/docs-out.log',
      log_file: './logs/docs-combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
};

