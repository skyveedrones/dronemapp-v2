/**
 * Tests for Rate Limiting and Subscription Plan Limits
 */

import { describe, it, expect } from 'vitest';
import { getPlanLimits } from './products';

describe('Subscription Plan Limits', () => {
  describe('Free Tier', () => {
    it('should have correct project limits', () => {
      const limits = getPlanLimits('free');
      expect(limits.maxProjects).toBe(3);
    });

    it('should have correct media limits per project', () => {
      const limits = getPlanLimits('free');
      expect(limits.maxMediaPerProject).toBe(100);
    });

    it('should have correct total media limits', () => {
      const limits = getPlanLimits('free');
      expect(limits.maxTotalMedia).toBe(100);
    });

    it('should have correct storage limits', () => {
      const limits = getPlanLimits('free');
      expect(limits.maxStorageTotalGB).toBe(1);
    });

    it('should have correct API rate limits', () => {
      const limits = getPlanLimits('free');
      expect(limits.dataRequestsPerHour).toBe(100);
      expect(limits.fileUploadsPerDay).toBe(10);
      expect(limits.pdfExportsPerDay).toBe(5);
      expect(limits.concurrentRequests).toBe(5);
    });

    it('should have basic features only', () => {
      const limits = getPlanLimits('free');
      expect(limits.features.gpsTagging).toBe(true);
      expect(limits.features.basicReports).toBe(false);
      expect(limits.features.apiAccess).toBe(false);
    });
  });

  describe('Starter Tier', () => {
    it('should have more projects than free', () => {
      const free = getPlanLimits('free');
      const starter = getPlanLimits('starter');
      expect(starter.maxProjects).toBeGreaterThan(free.maxProjects);
      expect(starter.maxProjects).toBe(10);
    });

    it('should have more media limits than free', () => {
      const free = getPlanLimits('free');
      const starter = getPlanLimits('starter');
      expect(starter.maxMediaPerProject).toBeGreaterThan(free.maxMediaPerProject);
      expect(starter.maxMediaPerProject).toBe(1000);
    });

    it('should have more storage than free', () => {
      const free = getPlanLimits('free');
      const starter = getPlanLimits('starter');
      expect(starter.maxStorageTotalGB).toBeGreaterThan(free.maxStorageTotalGB);
      expect(starter.maxStorageTotalGB).toBe(10);
    });

    it('should have higher API rate limits', () => {
      const free = getPlanLimits('free');
      const starter = getPlanLimits('starter');
      expect(starter.dataRequestsPerHour).toBeGreaterThan(free.dataRequestsPerHour);
      expect(starter.fileUploadsPerDay).toBeGreaterThan(free.fileUploadsPerDay);
    });

    it('should have more features', () => {
      const starter = getPlanLimits('starter');
      expect(starter.features.basicReports).toBe(true);
      expect(starter.features.unlimitedUploads).toBe(true);
    });
  });

  describe('Professional Tier', () => {
    it('should have more projects than starter', () => {
      const starter = getPlanLimits('starter');
      const professional = getPlanLimits('professional');
      expect(professional.maxProjects).toBeGreaterThan(starter.maxProjects);
      expect(professional.maxProjects).toBe(50);
    });

    it('should have more storage than starter', () => {
      const starter = getPlanLimits('starter');
      const professional = getPlanLimits('professional');
      expect(professional.maxStorageTotalGB).toBeGreaterThan(starter.maxStorageTotalGB);
      expect(professional.maxStorageTotalGB).toBe(100);
    });

    it('should have advanced features', () => {
      const professional = getPlanLimits('professional');
      expect(professional.features.advancedMapControls).toBe(true);
      expect(professional.features.markerClustering).toBe(true);
      expect(professional.features.allExportFormats).toBe(true);
      expect(professional.features.prioritySupport).toBe(true);
    });
  });

  describe('Business Tier', () => {
    it('should have more projects than professional', () => {
      const professional = getPlanLimits('professional');
      const business = getPlanLimits('business');
      expect(business.maxProjects).toBeGreaterThan(professional.maxProjects);
      expect(business.maxProjects).toBe(200);
    });

    it('should have unlimited team members', () => {
      const business = getPlanLimits('business');
      expect(business.maxTeamMembers).toBe(-1);
    });

    it('should have API access', () => {
      const business = getPlanLimits('business');
      expect(business.features.apiAccess).toBe(true);
      expect(business.features.customReports).toBe(true);
      expect(business.features.roleBasedAccess).toBe(true);
    });
  });

  describe('Enterprise Tier', () => {
    it('should have unlimited everything', () => {
      const enterprise = getPlanLimits('enterprise');
      expect(enterprise.maxProjects).toBe(-1);
      expect(enterprise.maxMediaPerProject).toBe(-1);
      expect(enterprise.maxTotalMedia).toBe(-1);
      expect(enterprise.maxStorageTotalGB).toBe(-1);
      expect(enterprise.maxTeamMembers).toBe(-1);
    });

    it('should have unlimited API calls', () => {
      const enterprise = getPlanLimits('enterprise');
      expect(enterprise.dataRequestsPerHour).toBe(-1);
      expect(enterprise.fileUploadsPerDay).toBe(-1);
      expect(enterprise.pdfExportsPerDay).toBe(-1);
      expect(enterprise.concurrentRequests).toBe(-1);
    });

    it('should have all features', () => {
      const enterprise = getPlanLimits('enterprise');
      expect(enterprise.features.unlimitedUploads).toBe(true);
      expect(enterprise.features.apiAccess).toBe(true);
      expect(enterprise.features.customIntegrations).toBe(true);
      expect(enterprise.features.sso).toBe(true);
      expect(enterprise.features.onPremise).toBe(true);
      expect(enterprise.features.dedicatedSupport).toBe(true);
    });
  });
});

describe('Rate Limiting Configuration', () => {
  it('should have consistent tier progression for API calls', () => {
    const free = getPlanLimits('free');
    const starter = getPlanLimits('starter');
    const professional = getPlanLimits('professional');
    const business = getPlanLimits('business');

    expect(starter.dataRequestsPerHour).toBeGreaterThan(free.dataRequestsPerHour);
    expect(professional.dataRequestsPerHour).toBeGreaterThan(starter.dataRequestsPerHour);
    expect(business.dataRequestsPerHour).toBeGreaterThan(professional.dataRequestsPerHour);
  });

  it('should have consistent tier progression for uploads', () => {
    const free = getPlanLimits('free');
    const starter = getPlanLimits('starter');
    const professional = getPlanLimits('professional');

    expect(starter.fileUploadsPerDay).toBeGreaterThan(free.fileUploadsPerDay);
    expect(professional.fileUploadsPerDay).toBeGreaterThan(starter.fileUploadsPerDay);
  });

  it('should have consistent tier progression for PDF exports', () => {
    const free = getPlanLimits('free');
    const starter = getPlanLimits('starter');
    const professional = getPlanLimits('professional');

    expect(starter.pdfExportsPerDay).toBeGreaterThan(free.pdfExportsPerDay);
    expect(professional.pdfExportsPerDay).toBeGreaterThan(starter.pdfExportsPerDay);
  });

  it('should have consistent tier progression for concurrent requests', () => {
    const free = getPlanLimits('free');
    const starter = getPlanLimits('starter');
    const professional = getPlanLimits('professional');

    expect(starter.concurrentRequests).toBeGreaterThan(free.concurrentRequests);
    expect(professional.concurrentRequests).toBeGreaterThan(starter.concurrentRequests);
  });
});

describe('Feature Access by Tier', () => {
  it('free tier should have limited features', () => {
    const free = getPlanLimits('free');
    expect(free.features.unlimitedUploads).toBe(false);
    expect(free.features.basicReports).toBe(false);
    expect(free.features.advancedMapControls).toBe(false);
    expect(free.features.apiAccess).toBe(false);
  });

  it('starter tier should unlock basic reports', () => {
    const starter = getPlanLimits('starter');
    expect(starter.features.basicReports).toBe(true);
    expect(starter.features.unlimitedUploads).toBe(true);
  });

  it('professional tier should unlock advanced features', () => {
    const professional = getPlanLimits('professional');
    expect(professional.features.advancedMapControls).toBe(true);
    expect(professional.features.markerClustering).toBe(true);
    expect(professional.features.allExportFormats).toBe(true);
    expect(professional.features.whiteLabeling).toBe(true);
  });

  it('business tier should unlock API access', () => {
    const business = getPlanLimits('business');
    expect(business.features.apiAccess).toBe(true);
    expect(business.features.customReports).toBe(true);
    expect(business.features.roleBasedAccess).toBe(true);
    expect(business.features.dedicatedSupport).toBe(true);
  });

  it('enterprise tier should have all features', () => {
    const enterprise = getPlanLimits('enterprise');
    const features = enterprise.features;
    
    // Check all features are enabled
    Object.values(features).forEach(value => {
      expect(value).toBe(true);
    });
  });
});

describe('Storage Limits Progression', () => {
  it('should increase storage with each tier', () => {
    const free = getPlanLimits('free');
    const starter = getPlanLimits('starter');
    const professional = getPlanLimits('professional');
    const business = getPlanLimits('business');

    expect(starter.maxStorageTotalGB).toBeGreaterThan(free.maxStorageTotalGB);
    expect(professional.maxStorageTotalGB).toBeGreaterThan(starter.maxStorageTotalGB);
    expect(business.maxStorageTotalGB).toBeGreaterThan(professional.maxStorageTotalGB);
  });

  it('should have per-project storage limits', () => {
    const tiers = ['free', 'starter', 'professional', 'business', 'enterprise'];
    
    for (const tier of tiers) {
      const limits = getPlanLimits(tier as any);
      expect(limits.maxStoragePerProjectGB).toBeDefined();
      if (tier !== 'enterprise') {
        expect(limits.maxStoragePerProjectGB).toBeGreaterThan(0);
      }
    }
  });
});

describe('Team Member Limits', () => {
  it('should increase team members with tier', () => {
    const free = getPlanLimits('free');
    const starter = getPlanLimits('starter');
    const professional = getPlanLimits('professional');

    expect(free.maxTeamMembers).toBe(1);
    expect(starter.maxTeamMembers).toBe(1);
    expect(professional.maxTeamMembers).toBe(5);
  });

  it('business tier should allow unlimited team members', () => {
    const business = getPlanLimits('business');
    expect(business.maxTeamMembers).toBe(-1);
  });
});

describe('Plan Consistency', () => {
  it('all tiers should have complete feature definitions', () => {
    const tiers = ['free', 'starter', 'professional', 'business', 'enterprise'];
    
    for (const tier of tiers) {
      const limits = getPlanLimits(tier as any);
      expect(limits.features).toBeDefined();
      expect(Object.keys(limits.features).length).toBeGreaterThan(0);
    }
  });

  it('all tiers should have rate limiting configured', () => {
    const tiers = ['free', 'starter', 'professional', 'business', 'enterprise'];
    
    for (const tier of tiers) {
      const limits = getPlanLimits(tier as any);
      expect(limits.dataRequestsPerHour).toBeDefined();
      expect(limits.fileUploadsPerDay).toBeDefined();
      expect(limits.pdfExportsPerDay).toBeDefined();
      expect(limits.concurrentRequests).toBeDefined();
    }
  });

  it('all tiers should have storage limits configured', () => {
    const tiers = ['free', 'starter', 'professional', 'business', 'enterprise'];
    
    for (const tier of tiers) {
      const limits = getPlanLimits(tier as any);
      expect(limits.maxStorageTotalGB).toBeDefined();
      expect(limits.maxStoragePerProjectGB).toBeDefined();
    }
  });
});
