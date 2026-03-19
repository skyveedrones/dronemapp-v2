/**
 * Stripe Products and Pricing Configuration
 * 
 * This file defines all subscription plans, their Stripe price IDs, and feature limits.
 * Update the Stripe price IDs after creating products in the Stripe Dashboard.
 */

export type SubscriptionTier = "free" | "starter" | "professional" | "business" | "enterprise";

export interface PlanLimits {
  maxProjects: number; // -1 for unlimited
  maxMediaPerProject: number; // -1 for unlimited
  maxTotalMedia: number; // -1 for unlimited
  maxStoragePerProjectGB: number;
  maxStorageTotalGB: number; // -1 for unlimited
  maxTeamMembers: number; // -1 for unlimited
  dataRequestsPerHour: number; // -1 for unlimited
  fileUploadsPerDay: number; // -1 for unlimited
  pdfExportsPerDay: number; // -1 for unlimited
  concurrentRequests: number; // -1 for unlimited
  features: {
    unlimitedUploads: boolean;
    gpsTagging: boolean;
    basicReports: boolean;
    advancedMapControls: boolean;
    markerClustering: boolean;
    allExportFormats: boolean;
    whiteLabeling: boolean;
    clientSharing: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
    customReports: boolean;
    roleBasedAccess: boolean;
    dedicatedSupport: boolean;
    customIntegrations: boolean;
    sso: boolean;
    onPremise: boolean;
  };
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  description: string;
  monthlyPriceId: string | null; // Stripe Price ID for monthly billing
  annualPriceId: string | null; // Stripe Price ID for annual billing
  monthlyPrice: number; // Price in dollars
  annualPrice: number; // Price in dollars
  limits: PlanLimits;
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free: {
    maxProjects: 3,
    maxMediaPerProject: 100,
    maxTotalMedia: 100,
    maxStoragePerProjectGB: 1,
    maxStorageTotalGB: 1,
    maxTeamMembers: 1,
    dataRequestsPerHour: 100,
    fileUploadsPerDay: 10,
    pdfExportsPerDay: 5,
    concurrentRequests: 5,
    features: {
      unlimitedUploads: false,
      gpsTagging: true,
      basicReports: false,
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
    maxStorageTotalGB: 100,
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
    maxStorageTotalGB: 500,
    maxTeamMembers: -1, // unlimited
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
    maxProjects: -1, // unlimited
    maxMediaPerProject: -1, // unlimited
    maxTotalMedia: -1, // unlimited
    maxStoragePerProjectGB: -1, // unlimited
    maxStorageTotalGB: -1, // unlimited
    maxTeamMembers: -1, // unlimited
    dataRequestsPerHour: -1, // unlimited
    fileUploadsPerDay: -1, // unlimited
    pdfExportsPerDay: -1, // unlimited
    concurrentRequests: -1, // unlimited
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

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Try out Mapit with basic features",
    monthlyPriceId: null,
    annualPriceId: null,
    monthlyPrice: 0,
    annualPrice: 0,
    limits: PLAN_LIMITS.free,
  },
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for individual drone pilots and freelancers",
    monthlyPriceId: "price_1T6Xu3GEMT6mikKwPibBZGCg",
    annualPriceId: "price_1T6Xu4GEMT6mikKwqmc0MCVL",
    monthlyPrice: 49,
    annualPrice: 490,
    limits: PLAN_LIMITS.starter,
  },
  {
    id: "professional",
    name: "Professional",
    description: "For professional drone service providers",
    monthlyPriceId: "price_1T6Xu4GEMT6mikKwINYKHcuI",
    annualPriceId: "price_1T6Xu4GEMT6mikKwqgE63wB7",
    monthlyPrice: 149,
    annualPrice: 1490,
    limits: PLAN_LIMITS.professional,
  },
  {
    id: "business",
    name: "Business",
    description: "For growing companies and teams",
    monthlyPriceId: "price_1T6Xu5GEMT6mikKwaxgTw2dy",
    annualPriceId: "price_1T6Xu5GEMT6mikKwCUBCrmlB",
    monthlyPrice: 349,
    annualPrice: 3490,
    limits: PLAN_LIMITS.business,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs",
    monthlyPriceId: null, // Enterprise is custom pricing
    annualPriceId: null,
    monthlyPrice: 0,
    annualPrice: 0,
    limits: PLAN_LIMITS.enterprise,
  },
];

/**
 * Get plan limits for a specific subscription tier
 */
export function getPlanLimits(tier: SubscriptionTier): PlanLimits {
  return PLAN_FEATURES[tier];
}

/**
 * Get subscription plan by tier
 */
export function getPlanByTier(tier: SubscriptionTier): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === tier);
}

/**
 * Check if user has reached project limit
 */
export function hasReachedProjectLimit(currentCount: number, tier: SubscriptionTier): boolean {
  const limits = getPlanLimits(tier);
  if (limits.maxProjects === -1) return false; // unlimited
  return currentCount >= limits.maxProjects;
}

/**
 * Check if user has reached team member limit
 */
export function hasReachedTeamLimit(currentCount: number, tier: SubscriptionTier): boolean {
  const limits = getPlanLimits(tier);
  if (limits.maxTeamMembers === -1) return false; // unlimited
  return currentCount >= limits.maxTeamMembers;
}

/**
 * Check if user has feature access
 */
export function hasFeatureAccess(tier: SubscriptionTier, feature: keyof PlanLimits['features']): boolean {
  const limits = getPlanLimits(tier);
  return limits.features[feature];
}
