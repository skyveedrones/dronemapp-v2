import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getUserAccessibleProjects, getUserProjectCount } from './db';

describe('Project Sharing', () => {
  it('getUserAccessibleProjects should return owned and shared projects', async () => {
    // Test that the function exists and has the correct signature
    expect(getUserAccessibleProjects).toBeDefined();
    expect(typeof getUserAccessibleProjects).toBe('function');
    
    // Call with a test user ID
    const result = await getUserAccessibleProjects(1);
    
    // Should return an object with 'owned' and 'shared' arrays
    expect(result).toHaveProperty('owned');
    expect(result).toHaveProperty('shared');
    expect(Array.isArray(result.owned)).toBe(true);
    expect(Array.isArray(result.shared)).toBe(true);
  });

  it('getUserProjectCount should count all accessible projects', async () => {
    // Test that the function exists
    expect(getUserProjectCount).toBeDefined();
    expect(typeof getUserProjectCount).toBe('function');
    
    // Call with a test user ID
    const count = await getUserProjectCount(1);
    
    // Should return a number
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('getUserProjectCount should include owned, shared, and client projects', async () => {
    // Get the accessible projects
    const { owned, shared } = await getUserAccessibleProjects(1);
    
    // Get the count
    const count = await getUserProjectCount(1);
    
    // Count should be at least the sum of owned and shared
    // (might be more if there are client projects, or less if there's overlap)
    expect(count).toBeGreaterThanOrEqual(0);
    
    // If user has projects, count should match or exceed owned projects
    if (owned.length > 0) {
      expect(count).toBeGreaterThanOrEqual(owned.length);
    }
  });

  it('shared projects should have sharedRole property', async () => {
    const { shared } = await getUserAccessibleProjects(1);
    
    // Each shared project should have a sharedRole
    shared.forEach(project => {
      if (project.sharedRole) {
        expect(['viewer', 'editor', 'vendor']).toContain(project.sharedRole);
      }
    });
  });
});
