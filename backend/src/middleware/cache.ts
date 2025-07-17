/**
 * Caching middleware for improved performance
 * Provides in-memory caching for API responses and data
 */

import { Request, Response, NextFunction } from 'express';
import cache from 'memory-cache';
import { systemLogger } from '../services/logger';

/**
 * Cache configuration interface
 */
interface CacheOptions {
  /** Cache duration in milliseconds */
  duration: number;
  /** Custom cache key generator */
  keyGenerator?: (req: Request) => string;
  /** Skip cache for certain conditions */
  skipCache?: (req: Request) => boolean;
}

/**
 * Default cache key generator
 * Creates a cache key based on method, URL, and query parameters
 */
const defaultKeyGenerator = (req: Request): string => {
  const queryString = Object.keys(req.query)
    .sort()
    .map(key => `${key}=${req.query[key]}`)
    .join('&');
  
  return `${req.method}:${req.originalUrl}${queryString ? '?' + queryString : ''}`;
};

/**
 * Cache middleware factory
 * Creates a caching middleware with specified options
 */
export const cacheMiddleware = (options: CacheOptions) => {
  const {
    duration,
    keyGenerator = defaultKeyGenerator,
    skipCache = () => false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip cache for non-GET requests or when skip condition is met
    if (req.method !== 'GET' || skipCache(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      systemLogger.info(`Cache hit for key: ${cacheKey}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Intercept the response to cache it
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body) {
      if (res.statusCode === 200) {
        cache.put(cacheKey, body, duration);
        systemLogger.info(`Cached response for key: ${cacheKey}, duration: ${duration}ms`);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalSend.call(this, body);
    };

    res.json = function(obj) {
      if (res.statusCode === 200) {
        cache.put(cacheKey, obj, duration);
        systemLogger.info(`Cached JSON response for key: ${cacheKey}, duration: ${duration}ms`);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson.call(this, obj);
    };

    next();
  };
};

/**
 * Predefined cache configurations for common use cases
 */
export const cacheConfigs = {
  /** Short-term cache for frequently changing data (1 minute) */
  short: {
    duration: 60 * 1000
  },
  
  /** Medium-term cache for moderately stable data (5 minutes) */
  medium: {
    duration: 5 * 60 * 1000
  },
  
  /** Long-term cache for stable data (30 minutes) */
  long: {
    duration: 30 * 60 * 1000
  },
  
  /** Static data cache (1 hour) */
  static: {
    duration: 60 * 60 * 1000,
    skipCache: (req: Request) => {
      // Skip cache for admin or authenticated requests
      return req.headers.authorization !== undefined;
    }
  }
};

/**
 * Cache management utilities
 */
export class CacheManager {
  /**
   * Clear all cached entries
   */
  static clearAll(): void {
    cache.clear();
    systemLogger.info('All cache entries cleared');
  }

  /**
   * Clear cache entries matching a pattern
   */
  static clearPattern(pattern: string): void {
    const keys = cache.keys();
    const matchingKeys = keys.filter((key: string) => key.includes(pattern));
    
    matchingKeys.forEach((key: string) => {
      cache.del(key);
    });
    
    systemLogger.info(`Cleared ${matchingKeys.length} cache entries matching pattern: ${pattern}`);
  }

  /**
   * Get cache statistics
   */
  static getStats(): { totalKeys: number; memoryUsage: string } {
    const keys = cache.keys();
    const memSize = cache.memsize();
    
    return {
      totalKeys: keys.length,
      memoryUsage: `${(memSize / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Clear expired cache entries
   */
  static clearExpired(): void {
    // memory-cache automatically removes expired entries,
    // but we can manually trigger garbage collection
    const beforeCount = cache.keys().length;
    
    // Force a check by accessing a non-existent key
    cache.get('__gc_trigger__');
    
    const afterCount = cache.keys().length;
    const cleared = beforeCount - afterCount;
    
    if (cleared > 0) {
      systemLogger.info(`Garbage collection cleared ${cleared} expired cache entries`);
    }
  }
}

/**
 * Utility functions for specific caching scenarios
 */

/**
 * Cache middleware for project data
 */
export const cacheProjects = cacheMiddleware({
  ...cacheConfigs.medium,
  keyGenerator: (req: Request) => `projects:${req.params.id || 'list'}:${JSON.stringify(req.query)}`
});

/**
 * Cache middleware for job data
 */
export const cacheJobs = cacheMiddleware({
  ...cacheConfigs.short,
  keyGenerator: (req: Request) => `jobs:${req.params.id || 'list'}:${JSON.stringify(req.query)}`,
  skipCache: (req: Request) => {
    // Don't cache if requesting real-time job status
    return req.query.realtime === 'true';
  }
});

/**
 * Cache middleware for system status
 */
export const cacheSystemStatus = cacheMiddleware({
  ...cacheConfigs.short,
  keyGenerator: () => 'system:status'
});

/**
 * Cache middleware for license status
 */
export const cacheLicenseStatus = cacheMiddleware({
  duration: 30 * 1000, // 30 seconds for license status
  keyGenerator: () => 'license:status'
}); 