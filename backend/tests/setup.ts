/**
 * Jest Test Setup
 * Global configuration and mocks for testing environment
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.HOST = 'localhost';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.LICENSE_CHECK_INTERVAL = '5000'; // Faster checks for tests

// Mock external dependencies that we don't want to actually call during tests
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Increase timeout for async operations
jest.setTimeout(10000);

// Global test utilities
global.console = {
  ...console,
  // Mock console methods to reduce noise during tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
}); 