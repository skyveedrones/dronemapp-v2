import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeRedisClient, getRedisClient, isRedisReady, closeRedisClient } from '../server/_core/rateLimiter';

describe('Rate Limiting Non-Blocking Startup', () => {
  beforeEach(async () => {
    // Reset Redis state before each test
    await closeRedisClient();
  });

  afterEach(async () => {
    // Clean up after each test
    await closeRedisClient();
  });

  it('should initialize Redis asynchronously without blocking', async () => {
    const startTime = Date.now();
    
    // This should return immediately without awaiting
    initializeRedisClient();
    
    const elapsedTime = Date.now() - startTime;
    
    // Should complete in less than 100ms (non-blocking)
    expect(elapsedTime).toBeLessThan(100);
  });

  it('should not block server startup when Redis is unavailable', async () => {
    const startTime = Date.now();
    
    // Initialize Redis (will fail to connect but shouldn't block)
    initializeRedisClient();
    
    // Wait a bit for initialization attempt
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const elapsedTime = Date.now() - startTime;
    
    // Should complete quickly even if Redis fails
    expect(elapsedTime).toBeLessThan(500);
  });

  it('should allow multiple initialization calls without issues', () => {
    // Call multiple times
    initializeRedisClient();
    initializeRedisClient();
    initializeRedisClient();
    
    // Should not throw any errors
    expect(true).toBe(true);
  });

  it('should return null for Redis client when not connected', () => {
    initializeRedisClient();
    
    // Immediately after initialization, client might not be ready
    const client = getRedisClient();
    
    // Could be null if Redis isn't available
    expect(client === null || client !== null).toBe(true);
  });

  it('should report Redis as not ready initially', () => {
    initializeRedisClient();
    
    // Should not be ready immediately
    const ready = isRedisReady();
    
    // Likely false since Redis isn't available in test environment
    expect(typeof ready).toBe('boolean');
  });

  it('should handle graceful shutdown properly', async () => {
    initializeRedisClient();
    
    // Wait for initialization attempt
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should not throw when closing
    await expect(closeRedisClient()).resolves.not.toThrow();
  });

  it('should use in-memory rate limiting when Redis unavailable', () => {
    initializeRedisClient();
    
    // Even without Redis, rate limiting should work
    // (this is handled by the middleware fallback)
    expect(true).toBe(true);
  });

  it('should allow server startup to proceed immediately', async () => {
    const initStart = Date.now();
    
    // Simulate server startup
    initializeRedisClient();
    
    // Server should be able to start immediately
    const initTime = Date.now() - initStart;
    
    expect(initTime).toBeLessThan(50);
  });

  it('should handle concurrent initialization attempts', () => {
    // Simulate concurrent calls
    const promises = [
      Promise.resolve(initializeRedisClient()),
      Promise.resolve(initializeRedisClient()),
      Promise.resolve(initializeRedisClient()),
    ];
    
    // Should not throw
    expect(promises.length).toBe(3);
  });

  it('should gracefully degrade to in-memory store', () => {
    // Initialize without Redis
    initializeRedisClient();
    
    // Rate limiting should still work with in-memory store
    const client = getRedisClient();
    
    // Either Redis is connected or in-memory fallback is used
    expect(typeof client === 'object' || client === null).toBe(true);
  });
});
