/**
 * Unit tests for application configuration
 */

import { config } from '../../src/config/app';

describe('Application Configuration', () => {
  it('should have required server configuration', () => {
    expect(config.port).toBeDefined();
    expect(config.host).toBeDefined();
  });

  it('should have CORS configuration', () => {
    expect(config.cors).toBeDefined();
    expect(config.cors.origin).toBeDefined();
    expect(config.cors.methods).toBeDefined();
    expect(Array.isArray(config.cors.methods)).toBe(true);
  });

  it('should have security configuration', () => {
    expect(config.security).toBeDefined();
    expect(config.security.rateLimitWindow).toBeDefined();
    expect(config.security.rateLimitMax).toBeDefined();
    expect(typeof config.security.rateLimitWindow).toBe('number');
    expect(typeof config.security.rateLimitMax).toBe('number');
  });

  it('should have tools configuration', () => {
    expect(config.tools).toBeDefined();
    expect(config.tools.questaSim).toBeDefined();
    expect(config.tools.questaFormal).toBeDefined();
    expect(config.tools.questaSim.vlog).toBeDefined();
    expect(config.tools.questaFormal.qverify).toBeDefined();
  });

  it('should have license configuration', () => {
    expect(config.license).toBeDefined();
    expect(config.license.server).toBeDefined();
    expect(config.license.checkInterval).toBeDefined();
    expect(typeof config.license.checkInterval).toBe('number');
  });

  it('should have workspace configuration', () => {
    expect(config.workspace).toBeDefined();
    expect(config.workspace.root).toBeDefined();
    expect(config.workspace.projects).toBeDefined();
    expect(config.workspace.jobs).toBeDefined();
  });

  it('should have upload configuration', () => {
    expect(config.upload).toBeDefined();
    expect(config.upload.maxFileSize).toBeDefined();
    expect(config.upload.maxFiles).toBeDefined();
    expect(config.upload.allowedExtensions).toBeDefined();
    expect(Array.isArray(config.upload.allowedExtensions)).toBe(true);
  });

  it('should have logging configuration', () => {
    expect(config.logging).toBeDefined();
    expect(config.logging.level).toBeDefined();
    expect(config.logging.file).toBeDefined();
  });
}); 