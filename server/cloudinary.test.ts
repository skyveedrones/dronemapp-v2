/**
 * Cloudinary Integration Tests
 * 
 * Tests to validate Cloudinary credentials and basic functionality
 */

import { describe, it, expect } from 'vitest';
import { testCloudinaryConnection, getCloudinaryUsage } from './cloudinaryStorage';

describe('Cloudinary Integration', () => {
  it('should successfully connect to Cloudinary with provided credentials', async () => {
    const isConnected = await testCloudinaryConnection();
    expect(isConnected).toBe(true);
  }, 10000);

  it('should be able to retrieve account usage information', async () => {
    const usage = await getCloudinaryUsage();
    expect(usage).not.toBeNull();
    expect(usage).toHaveProperty('used_percent');
    expect(usage).toHaveProperty('storage_used');
    expect(usage).toHaveProperty('bandwidth_used');
  }, 10000);
});
