/**
 * Unit tests for logger service
 */

import { appLogger, apiLogger, jobLogger, licenseLogger, systemLogger } from '../../src/services/logger';

describe('Logger Service', () => {
  it('should export app logger', () => {
    expect(appLogger).toBeDefined();
    expect(typeof appLogger.info).toBe('function');
    expect(typeof appLogger.error).toBe('function');
    expect(typeof appLogger.warn).toBe('function');
    expect(typeof appLogger.debug).toBe('function');
  });

  it('should export API logger', () => {
    expect(apiLogger).toBeDefined();
    expect(typeof apiLogger.logRequest).toBe('function');
    expect(typeof apiLogger.logResponse).toBe('function');
    expect(typeof apiLogger.error).toBe('function');
  });

  it('should export job logger', () => {
    expect(jobLogger).toBeDefined();
    expect(typeof jobLogger.logJob).toBe('function');
    expect(typeof jobLogger.error).toBe('function');
  });

  it('should export license logger', () => {
    expect(licenseLogger).toBeDefined();
    expect(typeof licenseLogger.logLicense).toBe('function');
    expect(typeof licenseLogger.error).toBe('function');
  });

  it('should export system logger', () => {
    expect(systemLogger).toBeDefined();
    expect(typeof systemLogger.info).toBe('function');
    expect(typeof systemLogger.error).toBe('function');
  });

  it('should log messages without throwing errors', () => {
    expect(() => {
      appLogger.info('Test message');
      jobLogger.logJob('test-job', 'created', 'Job created successfully');
      licenseLogger.logLicense('available', 'License check passed');
      systemLogger.info('System test message');
    }).not.toThrow();
  });
}); 