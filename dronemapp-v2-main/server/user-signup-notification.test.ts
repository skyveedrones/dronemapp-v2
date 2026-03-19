import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertUser } from './db';
import * as notificationModule from './_core/notification';

// Mock the notification module
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock the email module
vi.mock('./_core/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(true),
}));

describe('User Signup Notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send owner notification when new user signs up', async () => {
    const newUser = {
      openId: 'test-open-id-' + Date.now(),
      email: 'newuser@example.com',
      name: 'New Test User',
      loginMethod: 'OAuth',
      organization: 'Test Organization',
    };

    await upsertUser(newUser);

    // Verify notifyOwner was called
    expect(notificationModule.notifyOwner).toHaveBeenCalledWith({
      title: '🎉 New User Signup',
      content: expect.stringContaining('A new user has signed up to MAPit'),
    });

    // Verify notification includes user details
    const notifyCall = vi.mocked(notificationModule.notifyOwner).mock.calls[0][0];
    expect(notifyCall.content).toContain('New Test User');
    expect(notifyCall.content).toContain('newuser@example.com');
    expect(notifyCall.content).toContain('OAuth');
    expect(notifyCall.content).toContain('Test Organization');
  });

  it('should not send notification when existing user logs in', async () => {
    const existingUser = {
      openId: 'existing-user-open-id',
      email: 'existing@example.com',
      name: 'Existing User',
    };

    // First signup - should notify
    await upsertUser(existingUser);
    expect(notificationModule.notifyOwner).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();

    // Second login - should NOT notify
    await upsertUser(existingUser);
    expect(notificationModule.notifyOwner).not.toHaveBeenCalled();
  });

  it('should handle notification failure gracefully', async () => {
    // Mock notification failure
    vi.mocked(notificationModule.notifyOwner).mockRejectedValueOnce(
      new Error('Notification service unavailable')
    );

    const newUser = {
      openId: 'test-open-id-failure-' + Date.now(),
      email: 'failuretest@example.com',
      name: 'Failure Test User',
    };

    // Should not throw even if notification fails
    await expect(upsertUser(newUser)).resolves.not.toThrow();
  });

  it('should not send notification if user has no email or name', async () => {
    const incompleteUser = {
      openId: 'incomplete-user-' + Date.now(),
      // Missing email and name
    };

    await upsertUser(incompleteUser);

    // Should not send notification for incomplete user data
    expect(notificationModule.notifyOwner).not.toHaveBeenCalled();
  });
});
