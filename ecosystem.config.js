// Environment-based configuration for DHCP environments
const os = require('os');

// Get local IP address automatically
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost'; // fallback
}

// Configuration with environment variable support
const config = {
  // Default values
  BACKEND_PORT: process.env.BACKEND_PORT || 3001,
  FRONTEND_PORT: process.env.FRONTEND_PORT || 3000,
  HOST_IP: process.env.HOST_IP || getLocalIP(),
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

console.log(`🚀 PM2 Configuration:`);
console.log(`   Host IP: ${config.HOST_IP}`);
console.log(`   Backend Port: ${config.BACKEND_PORT}`);
console.log(`   Frontend Port: ${config.FRONTEND_PORT}`);
console.log(`   Environment: ${config.NODE_ENV}`);

// Define apps array
const apps = [
  {
    name: 'questa-backend',
    cwd: './backend',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: config.NODE_ENV,
      PORT: config.BACKEND_PORT,
      HOST: config.HOST_IP,
      LOG_LEVEL: config.LOG_LEVEL
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: config.BACKEND_PORT,
      HOST: config.HOST_IP,
      LOG_LEVEL: 'warn'
    },
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    env_development: {
      NODE_ENV: 'development',
      PORT: config.BACKEND_PORT,
      HOST: config.HOST_IP,
      LOG_LEVEL: 'debug'
    }
  }
];

// Add frontend service based on environment
if (config.NODE_ENV === 'production') {
  // Production: Serve built files
  apps.push({
    name: 'questa-frontend',
    cwd: './frontend',
    script: 'npx',
    args: 'serve -s build -l 3000',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: config.FRONTEND_PORT,
      REACT_APP_API_URL: `http://${config.HOST_IP}:${config.BACKEND_PORT}`,
      REACT_APP_WS_URL: `ws://${config.HOST_IP}:${config.BACKEND_PORT}`
    },
    watch: false,
    max_memory_restart: '512M',
    error_file: './logs/frontend-error.log',
    out_file: './logs/frontend-out.log',
    log_file: './logs/frontend-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  });
} else {
  // Development: Run development server
  apps.push({
    name: 'questa-frontend',
    cwd: './frontend',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: config.FRONTEND_PORT,
      BROWSER: 'none',
      REACT_APP_API_URL: `http://${config.HOST_IP}:${config.BACKEND_PORT}`,
      REACT_APP_WS_URL: `ws://${config.HOST_IP}:${config.BACKEND_PORT}`
    },
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/frontend-error.log',
    out_file: './logs/frontend-out.log',
    log_file: './logs/frontend-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 5,
    min_uptime: '30s'
  });
}

module.exports = { apps }; 