// PM2 Configuration for Production Deployment
module.exports = {
  apps: [{
    name: 'recruitment-system',
    script: './dist/index.js',
    cwd: '/var/www/recruitment-system',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    restart_delay: 1000,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};