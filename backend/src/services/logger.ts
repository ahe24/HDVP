import winston from 'winston';
import path from 'path';
import { config } from '../config/app';

/**
 * Create Winston logger instance with file and console transports
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'questa-web-interface',
    version: '1.0.0'
  },
  transports: [
    // Write to all logs with level `info` and below to combined.log
    new winston.transports.File({ 
      filename: path.resolve(config.logging.file),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write all logs error (and below) to error.log
    new winston.transports.File({ 
      filename: path.resolve(path.dirname(config.logging.file), 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  }));
}

/**
 * Enhanced logging methods with context
 */
export class Logger {
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
  }

  /**
   * Log info level message
   */
  info(message: string, meta?: any): void {
    logger.info(message, { context: this.context, ...meta });
  }

  /**
   * Log error level message
   */
  error(message: string, error?: Error | any, meta?: any): void {
    const errorMeta = {
      context: this.context,
      ...meta,
      ...(error instanceof Error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      }),
      ...(error && typeof error === 'object' && !(error instanceof Error) && {
        errorDetails: error
      })
    };
    
    logger.error(message, errorMeta);
  }

  /**
   * Log warning level message
   */
  warn(message: string, meta?: any): void {
    logger.warn(message, { context: this.context, ...meta });
  }

  /**
   * Log debug level message
   */
  debug(message: string, meta?: any): void {
    logger.debug(message, { context: this.context, ...meta });
  }

  /**
   * Log API request
   */
  logRequest(req: any, meta?: any): void {
    this.info('API Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...meta
    });
  }

  /**
   * Log API response
   */
  logResponse(req: any, res: any, duration: number, meta?: any): void {
    this.info('API Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ...meta
    });
  }

  /**
   * Log job lifecycle events
   */
  logJob(jobId: string, event: string, meta?: any): void {
    this.info(`Job ${event}`, {
      jobId,
      event,
      ...meta
    });
  }

  /**
   * Log license status changes
   */
  logLicense(status: string, meta?: any): void {
    this.info('License Status', {
      status,
      ...meta
    });
  }

  /**
   * Log system events
   */
  logSystem(event: string, meta?: any): void {
    this.info('System Event', {
      event,
      ...meta
    });
  }
}

// Export default logger instance
export const appLogger = new Logger('App');
export const apiLogger = new Logger('API');
export const jobLogger = new Logger('Job');
export const licenseLogger = new Logger('License');
export const systemLogger = new Logger('System');

// Export base winston logger for direct access if needed
export { logger as winston }; 