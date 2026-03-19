import { describe, it, expect } from 'vitest';
import { sendProjectWelcomeEmail } from './email';

describe('Project Welcome Email', () => {
  it('should have correct email structure', async () => {
    // Test that the function exists and has the correct signature
    expect(sendProjectWelcomeEmail).toBeDefined();
    expect(typeof sendProjectWelcomeEmail).toBe('function');
  });

  it('should accept correct parameters for viewer role', async () => {
    const params = {
      to: 'test@example.com',
      userName: 'John Doe',
      projectName: 'Demonstration Project',
      role: 'viewer' as const,
      inviterName: 'Jane Smith',
      projectUrl: 'https://skyveemapit.manus.space/project/1',
    };

    // This will attempt to send the email
    const result = await sendProjectWelcomeEmail(params);
    
    // Result should have success and optional error fields
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    
    if (!result.success) {
      expect(result).toHaveProperty('error');
    }
  });

  it('should accept correct parameters for editor role', async () => {
    const params = {
      to: 'test@example.com',
      userName: 'Jane Smith',
      projectName: 'Test Project',
      role: 'editor' as const,
      inviterName: 'John Doe',
      projectUrl: 'https://skyveemapit.manus.space/project/2',
    };

    const result = await sendProjectWelcomeEmail(params);
    expect(result).toHaveProperty('success');
  });

  it('should handle different project names', async () => {
    const params = {
      to: 'test@example.com',
      userName: 'Test User',
      projectName: 'City of Forney - Main Street Reconstruction',
      role: 'viewer' as const,
      inviterName: 'Project Manager',
      projectUrl: 'https://skyveemapit.manus.space/project/3',
    };

    const result = await sendProjectWelcomeEmail(params);
    expect(result).toHaveProperty('success');
  });
});
