/**
 * Client Invite Acceptance Flow Tests
 * 
 * Tests for the complete invite acceptance workflow including:
 * - Creating invitations
 * - Accepting invitations
 * - Verifying user appears in client portal
 * - Verifying user can see assigned projects
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('Client Invite Acceptance Flow', () => {
  let testUserId: number;
  let testClientId: number;
  let testProjectId: number;
  let invitationToken: string;

  beforeAll(async () => {
    // Create test user
    await db.upsertUser({
      openId: 'test-user-invite-' + Date.now(),
      name: 'Test User',
      email: 'test-invite@example.com',
    });

    // Get the created user
    const user = await db.getUserByOpenId('test-user-invite-' + Date.now());
    if (!user) throw new Error('Failed to create test user');
    testUserId = user.id;

    // Create test client
    const clientResult = await db.createClient({
      name: 'Test Client',
      ownerId: testUserId,
    });
    testClientId = clientResult.id;

    // Create test project assigned to client
    const projectResult = await db.createProject({
      name: 'Test Project for Client',
      ownerId: testUserId,
      clientId: testClientId,
    });
    testProjectId = projectResult.id;

    // Create invitation
    invitationToken = 'test-token-' + Date.now();
    await db.createClientInvitation({
      clientId: testClientId,
      email: 'invited-user@example.com',
      role: 'viewer',
      token: invitationToken,
      invitedBy: testUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  });

  describe('Invitation Creation', () => {
    it('should create a client invitation with valid token', async () => {
      const token = 'unique-token-' + Date.now();
      const invitation = await db.createClientInvitation({
        clientId: testClientId,
        email: 'test@example.com',
        role: 'viewer',
        token,
        invitedBy: testUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(invitation).toBeDefined();
      expect(invitation.token).toBe(token);
      expect(invitation.status).toBe('pending');
      expect(invitation.clientId).toBe(testClientId);
    });

    it('should retrieve invitation by token', async () => {
      const invitationData = await db.getClientInvitationByToken(invitationToken);

      expect(invitationData).toBeDefined();
      expect(invitationData?.invitation.token).toBe(invitationToken);
      expect(invitationData?.invitation.status).toBe('pending');
      expect(invitationData?.client.id).toBe(testClientId);
    });

    it('should not find non-existent invitation token', async () => {
      const invitationData = await db.getClientInvitationByToken('non-existent-token');
      expect(invitationData).toBeNull();
    });
  });

  describe('Invitation Acceptance', () => {
    it('should accept a pending invitation', async () => {
      const result = await db.acceptClientInvitation(invitationToken, testUserId);

      expect(result.success).toBe(true);
      expect(result.client?.id).toBe(testClientId);
    });

    it('should add user to client after acceptance', async () => {
      const clientUsers = await db.getClientUsers(testClientId);

      const userExists = clientUsers.some(cu => cu.userId === testUserId);
      expect(userExists).toBe(true);
    });

    it('should not accept already accepted invitation', async () => {
      // Try to accept the same invitation again
      const result = await db.acceptClientInvitation(invitationToken, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no longer valid');
    });

    it('should mark invitation as accepted', async () => {
      const invitationData = await db.getClientInvitationByToken(invitationToken);

      expect(invitationData?.invitation.status).toBe('accepted');
      expect(invitationData?.invitation.acceptedAt).toBeDefined();
    });
  });

  describe('User Portal Access', () => {
    it('should return user client access after acceptance', async () => {
      const clientAccess = await db.getUserClientAccess(testUserId);

      expect(clientAccess.length).toBeGreaterThan(0);
      const hasTestClient = clientAccess.some(ca => ca.client.id === testClientId);
      expect(hasTestClient).toBe(true);
    });

    it('should return correct role for user', async () => {
      const clientAccess = await db.getUserClientAccess(testUserId);
      const testClientAccess = clientAccess.find(ca => ca.client.id === testClientId);

      expect(testClientAccess?.role).toBe('viewer');
    });

    it('should return client projects for user', async () => {
      const projects = await db.getUserClientProjects(testUserId);

      expect(projects.length).toBeGreaterThan(0);
      const hasTestProject = projects.some(p => p.id === testProjectId);
      expect(hasTestProject).toBe(true);
    });

    it('should return empty projects for user without client access', async () => {
      // Create a new user without client access
      await db.upsertUser({
        openId: 'test-user-no-access-' + Date.now(),
        name: 'No Access User',
        email: 'no-access@example.com',
      });

      const user = await db.getUserByOpenId('test-user-no-access-' + Date.now());
      if (!user) throw new Error('Failed to create test user');

      const projects = await db.getUserClientProjects(user.id);
      expect(projects).toEqual([]);
    });
  });

  describe('Invitation Expiration', () => {
    it('should reject expired invitation', async () => {
      // Create an expired invitation
      const expiredToken = 'expired-token-' + Date.now();
      const expiredDate = new Date(Date.now() - 1000); // 1 second in the past

      await db.createClientInvitation({
        clientId: testClientId,
        email: 'expired@example.com',
        role: 'viewer',
        token: expiredToken,
        invitedBy: testUserId,
        expiresAt: expiredDate,
      });

      const result = await db.acceptClientInvitation(expiredToken, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should mark invitation as expired when accepting after expiration', async () => {
      const expiredToken = 'expired-check-' + Date.now();
      const expiredDate = new Date(Date.now() - 1000);

      await db.createClientInvitation({
        clientId: testClientId,
        email: 'check-expired@example.com',
        role: 'viewer',
        token: expiredToken,
        invitedBy: testUserId,
        expiresAt: expiredDate,
      });

      await db.acceptClientInvitation(expiredToken, testUserId);

      const invitationData = await db.getClientInvitationByToken(expiredToken);
      expect(invitationData?.invitation.status).toBe('expired');
    });
  });

  describe('Invitation Revocation', () => {
    it('should revoke a pending invitation', async () => {
      const revokeToken = 'revoke-token-' + Date.now();
      const invitation = await db.createClientInvitation({
        clientId: testClientId,
        email: 'revoke@example.com',
        role: 'viewer',
        token: revokeToken,
        invitedBy: testUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const revoked = await db.revokeClientInvitation(invitation.id, testUserId);
      expect(revoked).toBe(true);
    });

    it('should reject revoked invitation', async () => {
      const revokeToken = 'reject-revoke-' + Date.now();
      const invitation = await db.createClientInvitation({
        clientId: testClientId,
        email: 'reject-revoke@example.com',
        role: 'viewer',
        token: revokeToken,
        invitedBy: testUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await db.revokeClientInvitation(invitation.id, testUserId);

      const result = await db.acceptClientInvitation(revokeToken, testUserId);
      expect(result.success).toBe(false);
    });
  });

  describe('Multiple Users and Projects', () => {
    it('should handle multiple users with same client access', async () => {
      // Create second user
      await db.upsertUser({
        openId: 'test-user-2-' + Date.now(),
        name: 'Test User 2',
        email: 'test-user-2@example.com',
      });

      const user2 = await db.getUserByOpenId('test-user-2-' + Date.now());
      if (!user2) throw new Error('Failed to create second test user');

      // Add user2 to same client
      await db.addClientUser({
        clientId: testClientId,
        userId: user2.id,
        role: 'viewer',
      });

      // Both users should see the same projects
      const user1Projects = await db.getUserClientProjects(testUserId);
      const user2Projects = await db.getUserClientProjects(user2.id);

      expect(user1Projects.length).toBe(user2Projects.length);
      expect(user1Projects.map(p => p.id)).toEqual(user2Projects.map(p => p.id));
    });

    it('should handle different roles for same client', async () => {
      // Create admin user
      await db.upsertUser({
        openId: 'test-admin-' + Date.now(),
        name: 'Test Admin',
        email: 'test-admin@example.com',
      });

      const admin = await db.getUserByOpenId('test-admin-' + Date.now());
      if (!admin) throw new Error('Failed to create admin user');

      // Add as admin
      await db.addClientUser({
        clientId: testClientId,
        userId: admin.id,
        role: 'admin',
      });

      // Verify roles
      const clientAccess = await db.getUserClientAccess(admin.id);
      const adminAccess = clientAccess.find(ca => ca.client.id === testClientId);

      expect(adminAccess?.role).toBe('admin');
    });
  });

  afterAll(async () => {
    // Cleanup is handled by database transaction rollback in test environment
    // In production, you would need to manually delete test data
  });
});
