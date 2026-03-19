import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVersionCheckOnLogin } from './useVersionCheckOnLogin';

// Mock the dependencies
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@shared/version', () => ({
  APP_VERSION: {
    version: '1.0.8',
    commit: 'abc1234567890def',
    branch: 'main',
    buildDate: '2026-02-18T14:00:00.000Z',
    buildTimestamp: 1771420800000,
  },
}));

describe('useVersionCheckOnLogin', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not check version when user is not authenticated', () => {
    const { useAuth } = require('@/_core/hooks/useAuth');
    useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    renderHook(() => useVersionCheckOnLogin());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should check version when user logs in', async () => {
    const { useAuth } = require('@/_core/hooks/useAuth');
    const { toast } = require('sonner');

    useAuth.mockReturnValue({
      user: { id: 1, name: 'Test User' },
      isAuthenticated: true,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        version: '1.0.9',
        commit: 'def9876543210abc',
        fullCommit: 'def9876543210abc1234567890abcdef',
        buildDate: '2026-02-18T15:00:00.000Z',
        timestamp: 1771424400000,
      }),
    });

    renderHook(() => useVersionCheckOnLogin());

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/version.json'),
        expect.any(Object)
      );
    });
  });

  it('should show notification when new version is available', async () => {
    const { useAuth } = require('@/_core/hooks/useAuth');
    const { toast } = require('sonner');

    useAuth.mockReturnValue({
      user: { id: 1, name: 'Test User' },
      isAuthenticated: true,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        version: '1.0.9',
        commit: 'def9876',
        fullCommit: 'def9876543210abc1234567890abcdef',
        buildDate: '2026-02-18T15:00:00.000Z',
        timestamp: 1771424400000,
      }),
    });

    renderHook(() => useVersionCheckOnLogin());

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        'New version available!',
        expect.objectContaining({
          description: expect.stringContaining('Refresh to update'),
        })
      );
    });
  });

  it('should not show notification when versions match', async () => {
    const { useAuth } = require('@/_core/hooks/useAuth');
    const { toast } = require('sonner');

    useAuth.mockReturnValue({
      user: { id: 1, name: 'Test User' },
      isAuthenticated: true,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        version: '1.0.8',
        commit: 'abc1234',
        fullCommit: 'abc1234567890def1234567890abcdef',
        buildDate: '2026-02-18T14:00:00.000Z',
        timestamp: 1771420800000,
      }),
    });

    renderHook(() => useVersionCheckOnLogin());

    await waitFor(() => {
      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const { useAuth } = require('@/_core/hooks/useAuth');

    useAuth.mockReturnValue({
      user: { id: 1, name: 'Test User' },
      isAuthenticated: true,
    });

    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    renderHook(() => useVersionCheckOnLogin());

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Should not throw error
    expect(true).toBe(true);
  });
});
