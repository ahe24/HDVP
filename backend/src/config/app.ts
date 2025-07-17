/**
 * @fileoverview Application configuration for QuestaSim Web Interface
 * @description Centralized configuration management using environment variables with sensible defaults
 * @author QuestaSim Web Interface Team
 * @version 1.0.0
 */

/**
 * Main application configuration object
 * @description Contains all configuration settings for the application including server, security, tools, and database settings
 */
export const config = {
  /**
   * Server Configuration
   * @description Basic server settings for Express.js application
   */
  // Server Configuration
  /** @description Server port number (default: 3001) */
  port: Number(process.env.PORT) || 3001,
  /** @description Server host address (default: 0.0.0.0 for network access) */
  host: process.env.HOST || '0.0.0.0',
  
  /**
   * CORS and Security Configuration
   * @description Cross-Origin Resource Sharing and security settings
   */
  cors: {
    /** @description Allowed origins for CORS requests. Can be comma-separated list in CORS_ORIGIN env var */
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
      'http://localhost:3000', 
      'http://localhost:3001',
      // Allow any IP in the 192.168.x.x range for development
      /^http:\/\/192\.168\.\d+\.\d+:300[01]$/
    ],
    /** @description Allowed HTTP methods for CORS requests */
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    /** @description Allowed headers for CORS requests */
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    /** @description Whether to allow credentials in CORS requests */
    credentials: true,
  },
  
  /**
   * Security Configuration
   * @description Rate limiting and session security settings
   */
  security: {
    /** @description Rate limiting time window in milliseconds (default: 15 minutes) */
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    /** @description Maximum requests per window (default: 1000 for development) */
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000'), // 1000 requests per window (increased for development)
    /** @description Session secret for cryptographic signing (CHANGE IN PRODUCTION!) */
    sessionSecret: process.env.SESSION_SECRET || 'questa-web-interface-secret-change-in-production',
  },
  
  /**
   * QuestaSim Tool Paths Configuration
   * @description File system paths to QuestaSim and Questa Formal tool executables
   * All paths are now configurable via environment variables for easy deployment
   */
  tools: {
    /**
     * QuestaSim simulation tools
     */
    questaSim: {
      /** @description Path to ModelTech directory containing QuestaSim binaries */
      modeltech: process.env.QUESTA_MODELTECH_PATH || '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/linux_x86_64',
      /** @description Path to vlog (Verilog compiler) executable */
      vlog: process.env.QUESTA_VLOG_PATH || '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/linux_x86_64/vlog',
      /** @description Path to vopt (Verilog optimizer) executable */
      vopt: process.env.QUESTA_VOPT_PATH || '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/linux_x86_64/vopt',
      /** @description Path to vsim (Verilog simulator) executable */
      vsim: process.env.QUESTA_VSIM_PATH || '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/modeltech/linux_x86_64/vsim',
    },
    /**
     * Questa Formal verification tools
     */
    questaFormal: {
      /** @description Path to Questa Formal binaries directory */
      bin: process.env.QUESTA_FORMAL_PATH || '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/bin',
      /** @description Path to qverify (formal verification) executable */
      qverify: process.env.QUESTA_QVERIFY_PATH || '/opt/QOSF_2024.3/questa_static_formal/linux_x86_64/bin/qverify',
    }
  },
  
  /**
   * License Configuration
   * @description Settings for QuestaSim and Questa Formal license management
   * Modern Questa tools use SALT_LICENSE_SERVER instead of the deprecated LM_LICENSE_FILE
   */
  license: {
    /** @description License server address and port */
    server: process.env.LICENSE_SERVER || '29000@vbox',
    /** @description SALT license server configuration for modern Questa tools */
    saltLicenseServer: process.env.SALT_LICENSE_SERVER || '29000@vbox',
    /** @description License check interval in milliseconds (default: 60 seconds) */
    checkInterval: parseInt(process.env.LICENSE_CHECK_INTERVAL || '60000'), // 60 seconds instead of 30
  },
  
  // Workspace Configuration
  workspace: {
    root: process.env.WORKSPACE_ROOT || '../workspace',
    projects: process.env.PROJECTS_DIR || '../workspace/projects',
    jobs: process.env.JOBS_DIR || '../workspace/jobs',
    uploads: process.env.UPLOADS_DIR || './uploads',
    results: process.env.RESULTS_DIR || './public/results',
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 50,
    allowedExtensions: ['.v', '.sv', '.vh', '.svh', '.h', '.vhd', '.vhdl', '.sdc', '.xdc', '.f', '.txt', '.tcl', '.xlsx', '.xls'],
  },
  
  // Job Configuration
  job: {
    timeout: 30 * 60 * 1000, // 30 minutes
    cleanupOldJobs: 7 * 24 * 60 * 60 * 1000, // 7 days
    defaultSimulationTime: '1us',
  },
  
  // Jenkins Configuration
  jenkins: {
    url: process.env.JENKINS_URL || 'http://localhost:8080',
    username: process.env.JENKINS_USER || 'admin',
    token: process.env.JENKINS_TOKEN || '',
    jobName: 'questasim-pipeline',
  },
  
  // Database Configuration
  database: {
    path: process.env.DB_PATH || './data/questasim.db',
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
};