import { describe, it, expect, beforeAll } from 'vitest';
import { 
  getUserClientProjects, 
  userHasClientProjectAccess,
  getProjectById
} from './db';

describe('Client User Project Access', () => {
  let testClientId: number;
  let testUserId: number;
  let testProjectId: number;

  beforeAll(async () => {
    // These IDs should exist in your database from the actual client invite flow
    // Query the database to get real IDs for testing
    const { getDb } = await import('./db');
    const db = await getDb();
    
    if (!db) {
      throw new Error('Database not available for testing');
    }

    // Get a real client user from the database
    const { clientUsers } = await import('../drizzle/schema');
    const clientUserRecords = await db.select().from(clientUsers).limit(1);
    
    if (clientUserRecords.length === 0) {
      throw new Error('No client users found in database. Please create a client user first.');
    }

    testUserId = clientUserRecords[0].userId;
    testClientId = clientUserRecords[0].clientId;

    // Get a project assigned to this client
    const { projects } = await import('../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const projectRecords = await db.select().from(projects).where(eq(projects.clientId, testClientId)).limit(1);
    
    if (projectRecords.length === 0) {
      throw new Error('No projects assigned to this client. Please assign a project first.');
    }

    testProjectId = projectRecords[0].id;
  });

  it('should return projects for a user through their client memberships', async () => {
    const projects = await getUserClientProjects(testUserId);
    
    expect(projects).toBeDefined();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
    
    // Verify the project belongs to the client
    const project = projects.find(p => p.id === testProjectId);
    expect(project).toBeDefined();
    expect(project?.clientId).toBe(testClientId);
  });

  it('should confirm user has access to client project', async () => {
    const hasAccess = await userHasClientProjectAccess(testUserId, testProjectId);
    
    expect(hasAccess).toBe(true);
  });

  it('should return empty array for user with no client memberships', async () => {
    // Use a non-existent user ID
    const projects = await getUserClientProjects(999999);
    
    expect(projects).toBeDefined();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBe(0);
  });

  it('should return false for user without access to project', async () => {
    // Use a non-existent user ID
    const hasAccess = await userHasClientProjectAccess(999999, testProjectId);
    
    expect(hasAccess).toBe(false);
  });

  it('should allow client user to get project details', async () => {
    const project = await getProjectById(testProjectId);
    
    expect(project).toBeDefined();
    expect(project?.id).toBe(testProjectId);
    expect(project?.clientId).toBe(testClientId);
  });
});
