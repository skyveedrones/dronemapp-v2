// Minimal PLAN_FEATURES for server boot
export type SubscriptionTier = "free" | "pro";

export interface PlanLimits {
  maxProjects: number;
  maxMediaPerProject: number;
  maxTotalMedia: number;
  maxStoragePerProjectGB: number;
  maxStorageTotalGB: number;
  maxTeamMembers: number;
  dataRequestsPerHour: number;
  fileUploadsPerDay: number;
  pdfExportsPerDay: number;
  concurrentRequests: number;
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

export const PLAN_FEATURES: Record<SubscriptionTier, PlanLimits> = {
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
  pro: {
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
