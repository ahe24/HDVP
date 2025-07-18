// Environment-based configuration for DHCP environments
const os = require('os');
const path = require('path');
const fs = require('fs');

// Load .env file if it exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["]|["]$/, '');
          process.env[key] = cleanValue;
        }
      }
    });
    console.log('📄 Loaded .env file');
  } else {
    console.log('⚠️  No .env file found, using default values');
  }
}

// Load environment variables from .env file
loadEnvFile();

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
  BACKEND_PORT: process.env.BACKEND_PORT || 4100,
  FRONTEND_PORT: process.env.FRONTEND_PORT || 4000,
  HOST_IP: process.env.HOST_IP || getLocalIP(),
  BACKEND_HOST: process.env.BACKEND_HOST || '0.0.0.0', // Add this line
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // QuestaSim Tool Paths
  QUESTA_MODELTECH_PATH: process.env.QUESTA_MODELTECH_PATH,
  QUESTA_VLOG_PATH: process.env.QUESTA_VLOG_PATH,
  QUESTA_VOPT_PATH: process.env.QUESTA_VOPT_PATH,
  QUESTA_VSIM_PATH: process.env.QUESTA_VSIM_PATH,
  QUESTA_FORMAL_PATH: process.env.QUESTA_FORMAL_PATH,
  QUESTA_QVERIFY_PATH: process.env.QUESTA_QVERIFY_PATH,
  
  // License Configuration
  LICENSE_SERVER: process.env.LICENSE_SERVER,
  SALT_LICENSE_SERVER: process.env.SALT_LICENSE_SERVER
};

console.log(`🚀 PM2 Configuration:`);
console.log(`   Host IP: ${config.HOST_IP}`);
console.log(`   Backend Port: ${config.BACKEND_PORT}`);
console.log(`   Frontend Port: ${config.FRONTEND_PORT}`);
console.log(`   Environment: ${config.NODE_ENV}`);
console.log(`   QuestaSim Path: ${config.QUESTA_MODELTECH_PATH || 'Not set'}`);
console.log(`   License Server: ${config.SALT_LICENSE_SERVER || 'Not set'}`);

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
      HOST: config.BACKEND_HOST, 
      LOG_LEVEL: config.LOG_LEVEL,
      // QuestaSim Tool Paths
      QUESTA_MODELTECH_PATH: config.QUESTA_MODELTECH_PATH,
      QUESTA_VLOG_PATH: config.QUESTA_VLOG_PATH,
      QUESTA_VOPT_PATH: config.QUESTA_VOPT_PATH,
      QUESTA_VSIM_PATH: config.QUESTA_VSIM_PATH,
      QUESTA_FORMAL_PATH: config.QUESTA_FORMAL_PATH,
      QUESTA_QVERIFY_PATH: config.QUESTA_QVERIFY_PATH,
      // License Configuration
      LICENSE_SERVER: config.LICENSE_SERVER,
      SALT_LICENSE_SERVER: config.SALT_LICENSE_SERVER
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: config.BACKEND_PORT,
      HOST: config.BACKEND_HOST,
      LOG_LEVEL: 'warn',
      // QuestaSim Tool Paths
      QUESTA_MODELTECH_PATH: config.QUESTA_MODELTECH_PATH,
      QUESTA_VLOG_PATH: config.QUESTA_VLOG_PATH,
      QUESTA_VOPT_PATH: config.QUESTA_VOPT_PATH,
      QUESTA_VSIM_PATH: config.QUESTA_VSIM_PATH,
      QUESTA_FORMAL_PATH: config.QUESTA_FORMAL_PATH,
      QUESTA_QVERIFY_PATH: config.QUESTA_QVERIFY_PATH,
      // License Configuration
      LICENSE_SERVER: config.LICENSE_SERVER,
      SALT_LICENSE_SERVER: config.SALT_LICENSE_SERVER
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
      HOST: config.BACKEND_HOST,
      LOG_LEVEL: 'debug',
      // QuestaSim Tool Paths
      QUESTA_MODELTECH_PATH: config.QUESTA_MODELTECH_PATH,
      QUESTA_VLOG_PATH: config.QUESTA_VLOG_PATH,
      QUESTA_VOPT_PATH: config.QUESTA_VOPT_PATH,
      QUESTA_VSIM_PATH: config.QUESTA_VSIM_PATH,
      QUESTA_FORMAL_PATH: config.QUESTA_FORMAL_PATH,
      QUESTA_QVERIFY_PATH: config.QUESTA_QVERIFY_PATH,
      // License Configuration
      LICENSE_SERVER: config.LICENSE_SERVER,
      SALT_LICENSE_SERVER: config.SALT_LICENSE_SERVER
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