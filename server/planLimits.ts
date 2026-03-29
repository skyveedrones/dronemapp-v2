// Temporary plan limits based on pricing screenshot
export const PLAN_LIMITS = {
  pilot: {
    storageGB: 100,
    maxProjects: 10,
    maxStakeholders: 1,
    features: ["CAD Overlay Basics", "Email Support"],
  },
  municipal: {
    storageGB: 500,
    maxProjects: Infinity, // Unlimited
    maxStakeholders: 5,
    features: ["Sub-Surface Verification Docs"],
  },
  agency: {
    storageGB: 1500, // 1.5 TB
    maxProjects: Infinity, // Unlimited
    maxStakeholders: Infinity, // Unlimited viewing
    features: ["API Access", "Priority Processing"],
  },
  metropolitan: {
    storageGB: null, // Custom
    maxProjects: null, // Custom
    maxStakeholders: null, // Custom
    features: ["White-label City Portals", "On-site Training", "SLA Guarantee", "Dedicated Success Manager"],
  },
};
