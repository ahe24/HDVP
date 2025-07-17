import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs/promises';
import compression from 'compression';
import session from 'express-session';

import { config } from './config/app';
import { licenseManager } from './services/LicenseManager';
import { jobExecutor } from './services/JobExecutor';
import { rateLimiter } from './middleware/validation';
import { appLogger, apiLogger, systemLogger } from './services/logger';
import projectRoutes from './routes/projects';
import jobRoutes from './routes/jobs';
import systemRoutes from './routes/system';
import { CacheManager } from './middleware/cache';
import { jobs } from './routes/jobs';
import { saveJobMetadata } from './utils/jobLoader';
import { login, logout, checkAuth, requireAuth } from './middleware/auth';

// Create Express app
const app = express();
const server = createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: config.cors
});

// Middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware for better performance
app.use(compression({
  filter: (req, res) => {
    // Don't compress if the request has a 'x-no-compression' header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other responses
    return compression.filter(req, res);
  },
  level: 6, // Good balance between compression ratio and speed
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Rate limiting
app.use(rateLimiter);

// Session middleware (must be before routes)
app.use(session({
  secret: config.security.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  apiLogger.logRequest(req, {
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    apiLogger.logResponse(req, res, duration, {
      contentLength: res.get('Content-Length'),
      cacheStatus: res.get('X-Cache')
    });
  });

  next();
});

// Serve static files (results, uploads)
app.use('/results', express.static(path.join(__dirname, '../public/results')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Create necessary directories
async function createDirectories() {
  const dirs = [
    config.workspace.projects,
    config.workspace.jobs,
    config.workspace.uploads,
    config.workspace.results,
    path.join(__dirname, '../logs'),
    path.join(__dirname, '../data'),
    path.join(__dirname, '../public/results'),
    path.join(__dirname, '../uploads')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      systemLogger.info('Directory created', { directory: dir });
    } catch (error) {
      systemLogger.warn('Directory creation failed or already exists', { directory: dir, error });
    }
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  systemLogger.info('Client connected', { socketId: socket.id });

  // Send initial license status
  socket.emit('license-status', licenseManager.getQueueStatus());

  // Send queue status
  socket.emit('queue-update', licenseManager.getQueueStatus());

  socket.on('disconnect', () => {
    systemLogger.info('Client disconnected', { socketId: socket.id });
  });

  // Handle job status requests
  socket.on('subscribe-job', (jobId: string) => {
    socket.join(`job-${jobId}`);
    systemLogger.debug('Client subscribed to job', { socketId: socket.id, jobId });
  });

  socket.on('unsubscribe-job', (jobId: string) => {
    socket.leave(`job-${jobId}`);
    systemLogger.debug('Client unsubscribed from job', { socketId: socket.id, jobId });
  });
});

// License manager event handlers
licenseManager.on('license-status', (status) => {
  io.emit('license-status', status);
});

licenseManager.on('job-status', (data) => {
  io.to(`job-${data.jobId}`).emit('job-status', data);
  io.emit('queue-update', licenseManager.getQueueStatus());
});

licenseManager.on('job-progress', (data) => {
  io.to(`job-${data.jobId}`).emit('job-progress', data);
});

// REMOVED: job-logs streaming - no longer needed

licenseManager.on('queue-update', (data) => {
  io.emit('queue-update', data);
});

// Handle job execution
licenseManager.on('execute-job', async (job) => {
  try {
    await jobExecutor.executeJob(job);
  } catch (error) {
    systemLogger.error('Job execution failed', error, { jobId: job.id });
  } finally {
    // Always notify license manager that job is complete
    await licenseManager.onJobComplete(job.id);
  }
});

// Job executor event handlers
jobExecutor.on('job-status', async (data) => {
  // Update job status in the jobs Map
  const job = jobs.get(data.jobId);
  if (job) {
    job.status = data.status;
    if (data.error) job.error = data.error;
    if (data.results) job.results = data.results;
    if (data.status === 'running' && !job.startedAt) {
      job.startedAt = new Date();
    }
    if (data.status === 'completed' || data.status === 'failed') {
      job.completedAt = new Date();
    }
    jobs.set(data.jobId, job);
    console.log(`💾 Updated job ${data.jobId} status to: ${data.status}`);
    
    // Save updated job metadata to filesystem
    const jobPath = path.join(config.workspace.jobs, data.jobId);
    try {
      await saveJobMetadata(jobPath, job);
    } catch (error) {
      systemLogger.warn('Failed to save job metadata on status update', { jobId: data.jobId, error });
    }
  }
  
  io.to(`job-${data.jobId}`).emit('job-status', data);
  licenseManager.emit('job-status', data);
});

jobExecutor.on('job-progress', (data) => {
  io.to(`job-${data.jobId}`).emit('job-progress', data);
  licenseManager.emit('job-progress', data);
});

// REMOVED: job-logs event handler - no longer streaming logs in real-time
// Log files are now accessed via REST API endpoints

// Make io available to routes
app.set('io', io);

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/system', systemRoutes);
app.post('/api/login', login);
app.post('/api/logout', logout);
app.get('/api/auth', checkAuth);

// Health check endpoint
app.get('/health', (req, res) => {
  const cacheStats = CacheManager.getStats();
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cache: cacheStats
  });
});

// Cache management endpoints
app.post('/api/cache/clear', (req, res) => {
  const { pattern } = req.body;
  
  if (pattern) {
    CacheManager.clearPattern(pattern);
    appLogger.info(`Cache cleared for pattern: ${pattern}`);
  } else {
    CacheManager.clearAll();
    appLogger.info('All cache cleared');
  }
  
  res.json({ 
    success: true, 
    message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared' 
  });
});

app.get('/api/cache/stats', (req, res) => {
  const stats = CacheManager.getStats();
  res.json(stats);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'QuestaSim Web Interface API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  apiLogger.error('API Error', err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  apiLogger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
async function startServer() {
  try {
    // Create necessary directories
    await createDirectories();

    // Start server
    const port = Number(config.port);
    server.listen(port, config.host, () => {
      appLogger.info('QuestaSim Web Interface Server started', {
        server: `http://${config.host}:${port}`,
        websocket: `ws://${config.host}:${port}`,
        workspace: config.workspace.root,
        questaSim: config.tools.questaSim.modeltech,
        questaFormal: config.tools.questaFormal.bin,
        licenseServer: config.license.server
      });
      appLogger.info('Performance optimizations enabled:', {
        compression: true,
        caching: true,
        rateLimiting: true
      });
    });

    // Initial license check
    const licenseStatus = await licenseManager.checkLicense();
    appLogger.info('Initial license check completed', { 
      available: licenseStatus.available,
      status: licenseStatus.available ? 'Available' : 'Not Available'
    });

  } catch (error) {
    appLogger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  appLogger.info('SIGTERM received, shutting down gracefully');
  licenseManager.destroy();
  server.close(() => {
    appLogger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  appLogger.info('SIGINT received, shutting down gracefully');
  licenseManager.destroy();
  server.close(() => {
    appLogger.info('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

// Cache maintenance - run every 5 minutes
setInterval(() => {
  CacheManager.clearExpired();
}, 5 * 60 * 1000);