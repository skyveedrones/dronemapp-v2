export { PLAN_FEATURES, PLAN_LIMITS } from "./planFeatures";
      customReports: false,
      roleBasedAccess: false,
      dedicatedSupport: false,
      customIntegrations: false,
      sso: false,
      onPremise: false,
    },
  },
  starter: {
    maxProjects: 10,
    maxMediaPerProject: 1000,
    maxTotalMedia: 10000,
    maxStoragePerProjectGB: 10,
    maxStorageTotalGB: 10,
    maxTeamMembers: 1,
    dataRequestsPerHour: 500,
    fileUploadsPerDay: 50,
    pdfExportsPerDay: 20,
    concurrentRequests: 10,
    features: {
      unlimitedUploads: true,
      gpsTagging: true,
      basicReports: true,
      advancedMapControls: false,
      markerClustering: false,
      allExportFormats: false,
      whiteLabeling: false,
      clientSharing: false,
      prioritySupport: false,
      apiAccess: false,
      customReports: false,
      roleBasedAccess: false,
      dedicatedSupport: false,
      customIntegrations: false,
      sso: false,
      onPremise: false,
    },
  },
  professional: {
    maxProjects: 50,
    maxMediaPerProject: 10000,
    maxTotalMedia: 100000,
    maxStoragePerProjectGB: 100,
    maxStorageTotalGB: 500,
    maxTeamMembers: 5,
    dataRequestsPerHour: 2000,
    fileUploadsPerDay: 500,
    pdfExportsPerDay: 100,
    concurrentRequests: 50,
    features: {
      unlimitedUploads: true,
      gpsTagging: true,
      basicReports: true,
      advancedMapControls: true,
      markerClustering: true,
      allExportFormats: true,
      whiteLabeling: true,
      clientSharing: true,
      prioritySupport: true,
      apiAccess: false,
      customReports: false,
      roleBasedAccess: false,
      dedicatedSupport: false,
      customIntegrations: false,
      sso: false,
      onPremise: false,
    },
  },
  business: {
    maxProjects: 200,
    maxMediaPerProject: 50000,
    maxTotalMedia: 500000,
    maxStoragePerProjectGB: 500,
    maxStorageTotalGB: 1536,
    maxTeamMembers: -1,
    dataRequestsPerHour: 10000,
    fileUploadsPerDay: 5000,
    pdfExportsPerDay: 500,
    concurrentRequests: 100,
    features: {
      unlimitedUploads: true,
      gpsTagging: true,
      basicReports: true,
      advancedMapControls: true,
      markerClustering: true,
      allExportFormats: true,
      whiteLabeling: true,
      clientSharing: true,
      prioritySupport: true,
      apiAccess: true,
      customReports: true,
      roleBasedAccess: true,
      dedicatedSupport: true,
      customIntegrations: false,
      sso: false,
      onPremise: false,
    },
  },
  enterprise: {
    maxProjects: -1,
    maxMediaPerProject: -1,
    maxTotalMedia: -1,
    maxStoragePerProjectGB: -1,
    maxStorageTotalGB: -1,
    maxTeamMembers: -1,
    dataRequestsPerHour: -1,
    fileUploadsPerDay: -1,
    pdfExportsPerDay: -1,
    concurrentRequests: -1,
    features: {
      unlimitedUploads: true,
      gpsTagging: true,
      basicReports: true,
      advancedMapControls: true,
      markerClustering: true,
      allExportFormats: true,
      whiteLabeling: true,
      clientSharing: true,
      prioritySupport: true,
      apiAccess: true,
      customReports: true,
      roleBasedAccess: true,
      dedicatedSupport: true,
      customIntegrations: true,
      sso: true,
      onPremise: true,
    },
  },
};

/**
 * Check if user has reached project limit
 */
export function hasReachedProjectLimit(
  tier: SubscriptionTier,
  currentProjectCount: number
): boolean {
  const limits = PLAN_FEATURES[tier];
  return currentProjectCount >= limits.maxProjects;
}

/**
 * Check if user has reached media file limit
 */
export function hasReachedMediaLimit(
  tier: SubscriptionTier,
  currentMediaCount: number
): boolean {
  const limits = PLAN_FEATURES[tier];
  return currentMediaCount >= limits.maxMediaFiles;
}

/**
 * Check if user has reached team member limit
 */
export function hasReachedTeamMemberLimit(
  tier: SubscriptionTier,
  currentMemberCount: number
): boolean {
  const limits = PLAN_FEATURES[tier];
  return currentMemberCount >= limits.maxTeamMembers;
}

/**
 * Get remaining quota for a resource
 */
export function getRemainingQuota(
  tier: SubscriptionTier,
  resourceType: "projects" | "media" | "teamMembers",
  currentCount: number
): number {
  const limits = PLAN_FEATURES[tier];
  
  switch (resourceType) {
    case "projects":
      return Math.max(0, limits.maxProjects - currentCount);
    case "media":
      return Math.max(0, limits.maxMediaFiles - currentCount);
    case "teamMembers":
      return Math.max(0, limits.maxTeamMembers - currentCount);
    default:
      return 0;
  }
}

/**
 * Get usage percentage for a resource
 */
export function getUsagePercentage(
  tier: SubscriptionTier,
  resourceType: "projects" | "media" | "teamMembers",
  currentCount: number
): number {
  const limits = PLAN_FEATURES[tier];
  let limit = 0;

  switch (resourceType) {
    case "projects":
      limit = limits.maxProjects;
      break;
    case "media":
      limit = limits.maxMediaFiles;
      break;
    case "teamMembers":
      limit = limits.maxTeamMembers;
      break;
  }

  if (limit === 0 || limit > 999999) return 0; // Unlimited
  return Math.round((currentCount / limit) * 100);
}

/**
 * Get the next tier that would allow more of a resource
 */
export function getNextTierForResource(
  currentTier: SubscriptionTier,
  resourceType: "projects" | "media" | "teamMembers"
): SubscriptionTier | null {
  const tiers: SubscriptionTier[] = ["free", "starter", "professional", "business", "enterprise"];
  const currentIndex = tiers.indexOf(currentTier);

  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null; // Already at max tier or invalid tier
  }

  return tiers[currentIndex + 1];
}
