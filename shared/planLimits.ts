/**
 * Plan limits for different subscription tiers
 */

// Simple project count limits for feature-gating
export const PLAN_LIMITS = {
  FREE: 1,        // Just for testing
  PILOT: 5,       // 5 Projects
  MUNICIPAL: 25,  // 25 Projects
  ENTERPRISE: Infinity
} as const;

export type SubscriptionTier = "free" | "starter" | "professional" | "business" | "enterprise";

export interface PlanLimits {
  maxProjects: number;
  maxMediaFiles: number;
  maxTeamMembers: number;
  maxStorageGB: number;
  features: string[];
}

export const PLAN_FEATURES: Record<SubscriptionTier, PlanLimits> = {
  free: {
    maxProjects: 5,
    maxMediaFiles: 100,
    maxTeamMembers: 1,
    maxStorageGB: 1,
    features: [
      "Basic GPS export",
      "Community support",
    ],
  },
  starter: {
    maxProjects: 25,
    maxMediaFiles: 1000,
    maxTeamMembers: 2,
    maxStorageGB: 50,
    features: [
      "Advanced GPS export",
      "PDF map overlay",
      "Email support",
    ],
  },
  professional: {
    maxProjects: 999999,
    maxMediaFiles: 10000,
    maxTeamMembers: 5,
    maxStorageGB: 500,
    features: [
      "All Starter features",
      "Team collaboration",
      "Priority support",
      "Custom watermarks",
    ],
  },
  business: {
    maxProjects: 999999,
    maxMediaFiles: 999999,
    maxTeamMembers: 999999,
    maxStorageGB: 5000,
    features: [
      "All Professional features",
      "Unlimited team members",
      "Dedicated support",
      "API access",
    ],
  },
  enterprise: {
    maxProjects: 999999,
    maxMediaFiles: 999999,
    maxTeamMembers: 999999,
    maxStorageGB: 999999,
    features: [
      "Everything in Business",
      "Custom integrations",
      "SLA guarantee",
    ],
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
